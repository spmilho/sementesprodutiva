import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ReportTabProps {
  cycleId: string;
  orgId: string;
  cycle: any;
}

export default function ReportTab({ cycleId }: ReportTabProps) {
  const handleGenerate = () => {
    window.open(`/report/${cycleId}`, "_blank");
  };

  return (
    <div className="space-y-6">
      <Card className="border-primary/20">
        <CardContent className="p-8 text-center space-y-4">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mx-auto">
            <FileText className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">📄 Gerar Relatório Completo</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Relatório executivo com gráficos Recharts reais — custo zero, tudo no browser
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Abre em nova aba. Use "Imprimir / Salvar PDF" para gerar o PDF A4.
            </p>
          </div>
          <Button size="lg" className="px-8" onClick={handleGenerate}>
            <FileText className="h-5 w-5 mr-2" />
            Gerar Relatório Completo
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
