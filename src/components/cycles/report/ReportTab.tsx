import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Download, Trash2, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { generateFullReport } from "./generateFullReport";

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

  // Fetch previous reports
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
      await generateFullReport(cycleId, cycle, (msg, current, total) => {
        setProgressMsg(msg);
        setProgressPct(Math.round((current / total) * 100));
      });

      setProgressMsg("✅ Relatório gerado com sucesso!");
      setProgressPct(100);
      toast.success("Relatório gerado e salvo com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["report-attachments", cycleId] });

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
  }, [cycleId, cycle, queryClient]);

  const deleteMutation = useMutation({
    mutationFn: async (attachId: string) => {
      const { error } = await (supabase as any)
        .from("attachments")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", attachId);
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
      {/* Generate Button */}
      <Card className="border-primary/20">
        <CardContent className="p-8 text-center space-y-4">
          {!generating ? (
            <>
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mx-auto">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">📄 Gerar Relatório do Ciclo</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Relatório completo com todos os dados registrados até o momento.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Inclui apenas seções com dados reais — sem dados de planejamento.
                </p>
              </div>
              <Button size="lg" className="px-8" onClick={handleGenerate}>
                <FileText className="h-5 w-5 mr-2" />
                Gerar Relatório PDF
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

      {/* Report History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de Relatórios</CardTitle>
          <CardDescription>Relatórios gerados anteriormente para este ciclo.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingReports ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : reports.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum relatório gerado ainda.
            </p>
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
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => window.open(r.file_url, "_blank")}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => deleteMutation.mutate(r.id)}
                          disabled={deleteMutation.isPending}
                        >
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
