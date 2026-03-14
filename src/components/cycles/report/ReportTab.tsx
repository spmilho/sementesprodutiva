import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Trash2, Loader2, CheckCircle, Eye, Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { generateReportData } from "./generateHtmlReport";

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

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setProgressMsg("Iniciando...");
    setProgressPct(0);

    try {
      const reportData = await generateReportData(cycleId, cycle, (msg, current, total) => {
        setProgressMsg(msg);
        setProgressPct(Math.round((current / total) * 100));
      });

      const serialized = JSON.stringify(reportData);
      const reportKey = `reportData:${Date.now()}`;
      localStorage.setItem(reportKey, serialized);
      localStorage.setItem("reportData", serialized); // legacy fallback

      let reportUrl = `/report?key=${encodeURIComponent(reportKey)}`;
      try {
        const bytes = new TextEncoder().encode(serialized);
        let binary = "";
        bytes.forEach((b) => { binary += String.fromCharCode(b); });
        const encoded = btoa(binary);
        if (encoded.length < 120000) {
          reportUrl = `/report?data=${encodeURIComponent(encoded)}&key=${encodeURIComponent(reportKey)}`;
        }
      } catch {
        // fallback to key/localStorage only
      }

      const reportWindow = window.open("about:blank", "_blank");
      if (reportWindow) {
        reportWindow.name = serialized;
        reportWindow.location.href = reportUrl;
      } else {
        window.open(reportUrl, "_blank");
      }

      setProgressMsg("✅ Relatório aberto em nova aba!");
      setProgressPct(100);
      toast.success("Relatório aberto em nova aba!");

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
  }, [cycleId, cycle]);

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
                <h2 className="text-xl font-bold text-foreground">📄 Gerar Relatório Completo</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Relatório profissional com gráficos Recharts, tabelas e fotos — 100% client-side.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Abre em nova aba. Use "Imprimir / Salvar PDF" para gerar o PDF.
                </p>
              </div>
              <Button size="lg" className="px-8" onClick={handleGenerate}>
                <FileText className="h-5 w-5 mr-2" />
                Gerar Relatório
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
