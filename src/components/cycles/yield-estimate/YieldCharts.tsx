import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Cell } from "recharts";
import type { SamplePoint } from "./types";
import { getPointColor } from "./utils";

interface Props {
  points: SamplePoint[];
  avgNetYield: number;
  tgw: number;
  moistureRef: number;
  dehuskingLoss: number;
  classificationLoss: number;
  otherLoss: number;
}

export default function YieldCharts({ points, avgNetYield, tgw, moistureRef, dehuskingLoss, classificationLoss, otherLoss }: Props) {
  const chartData = useMemo(() => {
    return points.map((p) => {
      const grossAtRef = p.point_gross_yield_kg_ha || 0;
      const net = grossAtRef * (1 - dehuskingLoss / 100) * (1 - classificationLoss / 100) * (1 - otherLoss / 100);
      return {
        name: `P${p.point_number}`,
        produtividade: Math.round(net),
        espigas_ha: Math.round(p.ears_per_ha || 0),
        graos_espiga: Math.round(p.avg_kernels_per_ear || 0),
        posicao: p.pivot_position || "",
      };
    });
  }, [points, dehuskingLoss, classificationLoss, otherLoss]);

  if (points.length < 2) return null;

  return (
    <div className="space-y-4">
      {/* Chart 1 - Productivity per point */}
      <Card>
        <CardHeader><CardTitle className="text-base">Produtividade por Ponto de Amostragem</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(v: number) => [`${v.toLocaleString()} kg/ha`, "Produtividade"]} />
              <ReferenceLine y={avgNetYield} stroke="#3b82f6" strokeDasharray="5 5" label={{ value: `Média: ${Math.round(avgNetYield)}`, position: "right", fill: "#3b82f6", fontSize: 11 }} />
              <ReferenceLine y={avgNetYield * 1.1} stroke="#22c55e" strokeDasharray="2 2" strokeOpacity={0.4} />
              <ReferenceLine y={avgNetYield * 0.9} stroke="#ef4444" strokeDasharray="2 2" strokeOpacity={0.4} />
              <Bar dataKey="produtividade" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={getPointColor(entry.produtividade, avgNetYield)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Chart 2 - Components */}
      <Card>
        <CardHeader><CardTitle className="text-base">Componentes da Produtividade</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="espigas_ha" name="Espigas/ha" fill="#3b82f6" stackId="a" />
              <Bar dataKey="graos_espiga" name="Grãos/espiga" fill="#22c55e" stackId="b" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Chart 3 - Kernels distribution */}
      <Card>
        <CardHeader><CardTitle className="text-base">Grãos/Espiga por Ponto (min-média-max)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="graos_espiga" name="Média Grãos/Espiga" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
