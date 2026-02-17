import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { getLossLabel } from "./utils";

interface Props {
  avgEarsPerHa: number;
  avgKernelsPerEar: number;
  avgMoisture: number;
  tgw: number;
  pointCount: number;
  moistureRef: number;
  dehuskingLoss: number;
  classificationLoss: number;
  otherLoss: number;
  bagWeight: number;
  finalPms: string;
  femaleArea: number;
  onMoistureRefChange: (v: number) => void;
  onDehuskingChange: (v: number) => void;
  onClassificationChange: (v: number) => void;
  onOtherChange: (v: number) => void;
  onBagWeightChange: (v: number) => void;
  onFinalPmsChange: (v: string) => void;
}

export default function YieldCalculation({
  avgEarsPerHa, avgKernelsPerEar, avgMoisture, tgw, pointCount,
  moistureRef, dehuskingLoss, classificationLoss, otherLoss, bagWeight, finalPms, femaleArea,
  onMoistureRefChange, onDehuskingChange, onClassificationChange, onOtherChange, onBagWeightChange, onFinalPmsChange,
}: Props) {
  if (pointCount === 0) return null;

  const step1 = (avgEarsPerHa * avgKernelsPerEar * tgw) / 1_000_000;
  const step2 = step1 * ((100 - avgMoisture) / (100 - moistureRef));
  const step3 = step2 * (1 - dehuskingLoss / 100);
  const step4 = step3 * (1 - classificationLoss / 100);
  const step5 = step4 * (1 - otherLoss / 100);

  const dehInfo = getLossLabel(dehuskingLoss, [3, 5]);
  const classInfo = getLossLabel(classificationLoss, [10, 15]);
  const otherInfo = getLossLabel(otherLoss, [3, 5]);

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Cálculo da Produtividade Estimada</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        {/* Readonly params */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
          <div className="bg-muted/50 rounded p-2"><p className="text-xs text-muted-foreground">Espigas/ha</p><p className="font-mono font-bold">{Math.round(avgEarsPerHa).toLocaleString()}</p></div>
          <div className="bg-muted/50 rounded p-2"><p className="text-xs text-muted-foreground">Grãos/espiga</p><p className="font-mono font-bold">{avgKernelsPerEar.toFixed(0)}</p></div>
          <div className="bg-muted/50 rounded p-2"><p className="text-xs text-muted-foreground">PMG</p><p className="font-mono font-bold">{tgw}g</p></div>
          <div className="bg-muted/50 rounded p-2"><p className="text-xs text-muted-foreground">Umidade média</p><p className="font-mono font-bold">{avgMoisture.toFixed(1)}%</p></div>
          <div className="bg-muted/50 rounded p-2"><p className="text-xs text-muted-foreground">Pontos</p><p className="font-mono font-bold">{pointCount}</p></div>
        </div>

        {/* Editable params */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><Label>Umidade de referência (%)</Label><Input type="number" step="0.1" value={moistureRef} onChange={(e) => onMoistureRefChange(parseFloat(e.target.value) || 13)} className="mt-1" /></div>
          <div>
            <div className="flex justify-between"><Label>Perda despalha ({dehuskingLoss}%)</Label><span className={`text-xs font-medium ${dehInfo.color}`}>{dehInfo.label}</span></div>
            <Slider value={[dehuskingLoss]} onValueChange={([v]) => onDehuskingChange(v)} min={0} max={15} step={0.5} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">Típico: 2-5%</p>
          </div>
          <div>
            <div className="flex justify-between"><Label>Perda classificação ({classificationLoss}%)</Label><span className={`text-xs font-medium ${classInfo.color}`}>{classInfo.label}</span></div>
            <Slider value={[classificationLoss]} onValueChange={([v]) => onClassificationChange(v)} min={0} max={30} step={0.5} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">Típico sementes: 8-15%</p>
          </div>
          <div>
            <div className="flex justify-between"><Label>Outras perdas ({otherLoss}%)</Label><span className={`text-xs font-medium ${otherInfo.color}`}>{otherInfo.label}</span></div>
            <Slider value={[otherLoss]} onValueChange={([v]) => onOtherChange(v)} min={0} max={10} step={0.5} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">Típico: 1-3%</p>
          </div>
          <div><Label>Peso do saco (kg)</Label><Input type="number" step="1" value={bagWeight} onChange={(e) => onBagWeightChange(parseFloat(e.target.value) || 20)} className="mt-1" /></div>
          <div><Label>PMS final (g)</Label><Input type="number" value={finalPms} onChange={(e) => onFinalPmsChange(e.target.value)} placeholder="Opcional" className="mt-1" /><p className="text-xs text-muted-foreground mt-1">Após secagem e classificação</p></div>
        </div>

        {/* Step-by-step */}
        <div className="bg-muted/30 rounded-lg p-4 font-mono text-xs space-y-2 overflow-x-auto">
          <p className="font-sans font-semibold text-sm mb-3">Cálculo passo a passo</p>
          <p><strong>PASSO 1:</strong> Produtividade bruta de campo</p>
          <p className="pl-4">= {Math.round(avgEarsPerHa).toLocaleString()} × {avgKernelsPerEar.toFixed(0)} × {tgw} ÷ 1.000.000</p>
          <p className="pl-4 text-primary font-bold">= {step1.toFixed(2)} kg/ha (a {avgMoisture.toFixed(1)}% umidade)</p>

          <p className="mt-2"><strong>PASSO 2:</strong> Ajuste para umidade padrão ({moistureRef}%)</p>
          <p className="pl-4">= {step1.toFixed(2)} × (100 - {avgMoisture.toFixed(1)}) ÷ (100 - {moistureRef})</p>
          <p className="pl-4 text-primary font-bold">= {step2.toFixed(2)} kg/ha (base seca {moistureRef}%)</p>

          <p className="mt-2"><strong>PASSO 3:</strong> Desconto despalha ({dehuskingLoss}%)</p>
          <p className="pl-4">= {step2.toFixed(2)} × (1 - {dehuskingLoss}/100)</p>
          <p className="pl-4 text-primary font-bold">= {step3.toFixed(2)} kg/ha</p>

          <p className="mt-2"><strong>PASSO 4:</strong> Desconto classificação ({classificationLoss}%)</p>
          <p className="pl-4">= {step3.toFixed(2)} × (1 - {classificationLoss}/100)</p>
          <p className="pl-4 text-primary font-bold">= {step4.toFixed(2)} kg/ha</p>

          <p className="mt-2"><strong>PASSO 5:</strong> Desconto outras perdas ({otherLoss}%)</p>
          <p className="pl-4">= {step4.toFixed(2)} × (1 - {otherLoss}/100)</p>
          <p className="pl-4 text-green-600 font-bold text-sm">= {step5.toFixed(2)} kg/ha ← PRODUTIVIDADE LÍQUIDA ESTIMADA</p>

          <p className="mt-2"><strong>PASSO 6:</strong> Conversão</p>
          <p className="pl-4">= {step5.toFixed(2)} ÷ 1000 = <strong>{(step5 / 1000).toFixed(3)} ton/ha</strong></p>
          <p className="pl-4">= {step5.toFixed(2)} ÷ {bagWeight} = <strong>{(step5 / bagWeight).toFixed(1)} sacos/ha</strong></p>
          <p className="pl-4">× {femaleArea} ha = <strong>{((step5 / bagWeight) * femaleArea).toFixed(0)} sacos totais</strong></p>
          <p className="pl-4">× {femaleArea} ha = <strong>{((step5 * femaleArea) / 1000).toFixed(2)} toneladas totais</strong></p>
        </div>
      </CardContent>
    </Card>
  );
}
