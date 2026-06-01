import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getReliability } from "./utils";

interface Props {
  netYieldKgHa: number;
  grossYieldKgHa: number;
  totalTons: number;
  totalBags: number;
  bagWeight: number;
  femaleArea: number;
  avgEarsPerHa: number;
  viableEarsPctAvg: number;
  totalLossPct: number;
  lostKgHa: number;
  pointCount: number;
  expectedProductivity?: number;
  ubsYieldPct?: number;
  onUbsYieldChange?: (v: number) => void;
  onBagWeightChange?: (v: number) => void;
}

export default function YieldDashboard({
  netYieldKgHa, grossYieldKgHa, totalTons, totalBags, bagWeight, femaleArea,
  avgEarsPerHa, viableEarsPctAvg, totalLossPct, lostKgHa, pointCount, expectedProductivity,
  ubsYieldPct = 40, onUbsYieldChange, onBagWeightChange,
}: Props) {
  if (pointCount === 0) return null;

  const reliability = getReliability(pointCount, femaleArea);
  const metaPct = expectedProductivity && expectedProductivity > 0 ? (netYieldKgHa / expectedProductivity) * 100 : null;

  // Final productivity in seed bags/ha: field yield (kg/ha) * UBS yield% / bag weight (kg)
  const seedKgHa = netYieldKgHa * (ubsYieldPct / 100);
  const finalBagsHa = bagWeight > 0 ? seedKgHa / bagWeight : 0;
  const finalTotalBags = finalBagsHa * femaleArea;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Card 1 - Main: Field productivity */}
        <Card className="col-span-2 lg:col-span-1 border-primary/30 bg-primary/5">
          <CardContent className="p-5 text-center">
            <p className="text-xs text-muted-foreground mb-1">PROD. TOTAL A CAMPO</p>
            <p className="text-4xl font-bold text-green-600">{netYieldKgHa.toFixed(0)}</p>
            <p className="text-lg font-semibold text-green-600">kg/ha</p>
            <p className="text-sm font-medium mt-1">{(netYieldKgHa / bagWeight).toFixed(1)} sc/ha ({bagWeight}kg)</p>
            <p className="text-xs text-muted-foreground mt-1">Base 13% umidade, líquido de perdas</p>
          </CardContent>
        </Card>

        {/* Card 2 */}
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">PRODUÇÃO TOTAL A CAMPO</p>
            <p className="text-2xl font-bold mt-1">{totalTons.toFixed(1)} <span className="text-sm font-normal">ton</span></p>
            <p className="text-sm font-medium">{totalBags.toFixed(0)} sacos</p>
            <p className="text-xs text-muted-foreground mt-1">Para {femaleArea} ha de fêmea</p>
          </CardContent>
        </Card>

        {/* Card 3 */}
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">PRODUTIVIDADE BRUTA</p>
            <p className="text-2xl font-bold mt-1">{grossYieldKgHa.toFixed(0)} <span className="text-sm font-normal">kg/ha</span></p>
            <p className="text-xs text-muted-foreground mt-1">Antes das perdas</p>
          </CardContent>
        </Card>

        {/* Card 4 */}
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">TOTAL DE PERDAS</p>
            <p className="text-2xl font-bold mt-1 text-red-600">{totalLossPct.toFixed(1)}%</p>
            <p className="text-sm">{lostKgHa.toFixed(0)} kg/ha perdidos</p>
          </CardContent>
        </Card>

        {/* Card 5 */}
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">ESPIGAS VIÁVEIS</p>
            <p className="text-2xl font-bold mt-1">{Math.round(avgEarsPerHa).toLocaleString()} <span className="text-sm font-normal">/ha</span></p>
            <p className="text-sm">{viableEarsPctAvg.toFixed(1)}% de aproveitamento</p>
          </CardContent>
        </Card>

        {/* Card 6 */}
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">CONFIABILIDADE</p>
            <Badge className={`mt-1 ${reliability.color === "text-green-600" ? "bg-green-100 text-green-700" : reliability.color === "text-yellow-600" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
              {reliability.label}
            </Badge>
            <p className="text-xs text-muted-foreground mt-2">{pointCount} pontos em {femaleArea} ha = 1 ponto a cada {reliability.ratio.toFixed(0)} ha</p>
          </CardContent>
        </Card>
      </div>

      {/* Final productivity (after UBS) */}
      <Card className="border-amber-300 bg-amber-50/40 dark:border-amber-900 dark:bg-amber-950/20">
        <CardContent className="p-5">
          <div className="flex flex-col lg:flex-row gap-5 items-start lg:items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                Produtividade Final em Sementes (após UBS)
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Prod. a campo × Rendimento UBS ÷ Peso do saco
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 w-full lg:w-auto">
              <div className="space-y-1">
                <Label className="text-xs">Rendimento UBS (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  value={ubsYieldPct}
                  onChange={(e) => onUbsYieldChange?.(parseFloat(e.target.value) || 0)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Peso médio saco (kg)</Label>
                <Input
                  type="number"
                  min={0.1}
                  step="0.1"
                  value={bagWeight}
                  onChange={(e) => onBagWeightChange?.(parseFloat(e.target.value) || 0)}
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-amber-200 dark:border-amber-900">
            <div>
              <p className="text-xs text-muted-foreground">Sementes (kg/ha)</p>
              <p className="text-xl font-bold text-amber-700 dark:text-amber-300">
                {seedKgHa.toFixed(0)} <span className="text-xs font-normal">kg/ha</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Produtividade Final</p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                {finalBagsHa.toFixed(2)} <span className="text-xs font-normal">sc/ha</span>
              </p>
              <p className="text-[11px] text-muted-foreground">sacos de {bagWeight} kg</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total na Área</p>
              <p className="text-xl font-bold text-amber-700 dark:text-amber-300">
                {finalTotalBags.toFixed(0)} <span className="text-xs font-normal">sacos</span>
              </p>
              <p className="text-[11px] text-muted-foreground">em {femaleArea} ha de fêmea</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Meta comparison */}
      {metaPct !== null && expectedProductivity && (
        <Card className="border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Meta: {expectedProductivity} kg/ha</span>
              <span className="text-sm font-medium">Estimado: {netYieldKgHa.toFixed(0)} kg/ha</span>
              <Badge className={metaPct >= 90 ? "bg-green-100 text-green-700" : metaPct >= 70 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}>
                {metaPct.toFixed(1)}% da meta
              </Badge>
            </div>
            <Progress value={Math.min(metaPct, 100)} className="h-3" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
