import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Trash2, Loader2, CheckCircle, Eye, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { callClaude } from "@/services/anthropicApi";
import { fetchReportData } from "./useReportData";
import { buildReportPayload, SYSTEM_PROMPT, buildPrompt1, buildPrompt2, buildPrompt3, openReportWindow, cleanHtml } from "./reportClaudeUtils";

interface ReportTabProps {
  cycleId: string;
  orgId: string;
  cycle: any;
}

export default function ReportTab({ cycleId, orgId, cycle }: ReportTabProps) {
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [progressPct, setProgressPct] = useState(0);

  const { data: reports = [], isLoading: loadingReports } = useQuery({
    queryKey: ["report-attachments", cycleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("attachments")
        .select("*")
        .eq("entity_id", cycleId)
        .eq("document_category", "relatorio")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const callWithRetry = async (system: string, msg: string, tokens: number): Promise<string | null> => {
    try {
      return await callClaude(system, msg, tokens);
    } catch {
      await new Promise(r => setTimeout(r, 2000));
      try {
        return await callClaude(system, msg, tokens);
      } catch {
        return null;
      }
    }
  };

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setProgressPct(0);
    setProgressMsg("Coletando dados do ciclo...");

    try {
      // Step 1: Fetch data
      setProgressPct(10);
      const rawData = await fetchReportData(cycleId, cycle);
      const reportData = buildReportPayload(rawData, cycle);

      // Step 2: Charts placeholder (skip html2canvas for now)
      setProgressPct(30);
      setProgressMsg("Renderizando gráficos...");
      const charts: Record<string, string | null> = {};

      // Step 3: Call Claude - Part 1
      setProgressPct(50);
      setProgressMsg("Gerando capa e plantio... (1/3)");
      const prompt1 = buildPrompt1(reportData, charts);
      const part1 = await callWithRetry(SYSTEM_PROMPT, prompt1, 16000);

      // Step 4: Call Claude - Part 2
      setProgressPct(70);
      setProgressMsg("Gerando manejo e monitoramento... (2/3)");
      const prompt2 = buildPrompt2(reportData, charts);
      const part2 = await callWithRetry(SYSTEM_PROMPT, prompt2, 16000);

      // Step 5: Call Claude - Part 3
      setProgressPct(90);
      setProgressMsg("Gerando conclusão técnica... (3/3)");
      const prompt3 = buildPrompt3(reportData);
      const part3 = await callWithRetry(SYSTEM_PROMPT, prompt3, 16000);

      // Check results
      if (!part1 && !part2 && !part3) {
        toast.error("❌ Erro ao gerar. Verifique a API key em Configurações → Organização.");
        return;
      }

      if (!part1 || !part2 || !part3) {
        toast.warning("⚠️ Relatório parcial gerado.");
      }

      // Assemble
      let fullHtml = "";
      if (part1) fullHtml += part1;
      if (part2) fullHtml += "\n" + part2;
      if (part3) fullHtml += "\n" + part3;

      fullHtml = cleanHtml(fullHtml);

      if (!fullHtml.trim()) {
        toast.error("Não foi possível gerar o relatório. Verifique a API key.");
        return;
      }

      // Open in new tab
      openReportWindow(fullHtml, reportData.hibrido, reportData.safra);

      setProgressPct(100);
      setProgressMsg("✅ Relatório pronto!");
      toast.success("✅ Relatório gerado!");

      // Save to storage
      try {
        const blob = new Blob([fullHtml], { type: "text/html" });
        const fileName = `Relatorio_${reportData.hibrido.replace(/[/\\]/g, "_")}_${new Date().toISOString().slice(0, 10)}.html`;
        const storagePath = `${orgId}/${cycleId}/reports/${fileName}`;

        await supabase.storage.from("cycle-documents").upload(storagePath, blob, {
          contentType: "text/html",
          upsert: true,
        });

        const { data: urlData } = supabase.storage.from("cycle-documents").getPublicUrl(storagePath);

        // Save as attachment
        const { data: user } = await supabase.auth.getUser();
        await (supabase as any).from("attachments").insert({
          entity_id: cycleId,
          entity_type: "cycle",
          document_category: "relatorio",
          file_name: fileName,
          file_type: "html",
          file_url: urlData?.publicUrl || storagePath,
          file_size: blob.size,
          org_id: orgId,
          created_by: user.user?.id,
        });

        queryClient.invalidateQueries({ queryKey: ["report-attachments", cycleId] });
      } catch (e) {
        console.error("Erro salvando relatório:", e);
      }

      setTimeout(() => {
        setGenerating(false);
        setProgressMsg("");
        setProgressPct(0);
      }, 2000);
    } catch (err: any) {
      console.error("Erro ao gerar relatório:", err);
      toast.error(`Erro ao gerar relatório: ${err.message}`);
      setGenerating(false);
      setProgressMsg("");
      setProgressPct(0);
    }
  }, [cycleId, orgId, cycle, queryClient]);

  const handleViewReport = useCallback(async (fileUrl: string) => {
    try {
      const res = await fetch(fileUrl);
      if (!res.ok) throw new Error("Falha ao baixar");
      const htmlText = await res.text();
      const newWindow = window.open("", "_blank");
      if (newWindow) {
        newWindow.document.write(htmlText);
        newWindow.document.close();
      }
    } catch {
      toast.error("Erro ao abrir relatório.");
    }
  }, []);

  const deleteMutation = useMutation({
    mutationFn: async (attachId: string) => {
      const { error } = await supabase.rpc("soft_delete_record", {
        _table_name: "attachments",
        _record_id: attachId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-attachments", cycleId] });
      toast.success("Relatório excluído.");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <Card className="border-primary/20">
        <CardContent className="p-8 text-center space-y-4">
          {!generating ? (
            <>
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mx-auto">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">📄 Gerar Relatório Profissional</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Relatório executivo com gráficos e análises gerado por IA
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Abre em nova aba. Use "Imprimir / Salvar PDF" para gerar o PDF.
                </p>
              </div>
              <Button size="lg" className="px-8" onClick={handleGenerate}>
                <FileText className="h-5 w-5 mr-2" />
                Gerar Relatório Profissional
              </Button>
            </>
          ) : (
            <div className="space-y-4 max-w-md mx-auto">
              {progressPct < 100 ? (
                <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
              ) : (
                <CheckCircle className="h-10 w-10 text-primary mx-auto" />
              )}
              <p className="text-sm font-medium text-foreground">{progressMsg}</p>
              <Progress value={progressPct} className="h-2" />
              <p className="text-xs text-muted-foreground">{progressPct}%</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de Relatórios</CardTitle>
          <CardDescription>Relatórios gerados anteriormente.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingReports ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : reports.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum relatório salvo.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Arquivo</TableHead>
                  <TableHead>Tamanho</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">
                      {new Date(r.created_at).toLocaleDateString("pt-BR")}{" "}
                      {new Date(r.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-mono truncate max-w-[200px]">{r.file_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {r.file_size ? `${(r.file_size / 1024).toFixed(0)} KB` : "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {r.file_url && (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Visualizar" onClick={() => handleViewReport(r.file_url)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Baixar" onClick={() => { const a = document.createElement("a"); a.href = r.file_url; a.download = r.file_name; a.click(); }}>
                              <Download className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title="Excluir" onClick={() => deleteMutation.mutate(r.id)} disabled={deleteMutation.isPending}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
