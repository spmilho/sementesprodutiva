import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  ResponsiveContainer, ReferenceLine, LabelList,
} from "recharts";

interface Props {
  avgEarsPerHa: number;
  avgKernelsPerEar: number;
  tgw: number;
  avgMoisture: number;
  moistureRef: number;
  dehuskingLoss: number;
  classificationLoss: number;
  otherLoss: number;
}

export default function YieldWaterfallChart({
  avgEarsPerHa, avgKernelsPerEar, tgw, avgMoisture,
  moistureRef, dehuskingLoss, classificationLoss, otherLoss,
}: Props) {
  const data = useMemo(() => {
    // Step 1: raw field yield (wet ear)
    const fieldYield = (avgEarsPerHa * avgKernelsPerEar * tgw) / 1_000_000;
    // Moisture loss
    const moistureLoss = fieldYield - fieldYield * ((100 - avgMoisture) / (100 - moistureRef));
    const afterMoisture = fieldYield - moistureLoss;
    // Dehusking loss (palha e sabugo)
    const dehuskLoss = afterMoisture * (dehuskingLoss / 100);
    const afterDehusk = afterMoisture - dehuskLoss;
    // Classification loss (classificação/beneficiamento)
    const classLoss = afterDehusk * (classificationLoss / 100);
    const afterClass = afterDehusk - classLoss;
    // Other loss (colheita e outras)
    const otherLossVal = afterClass * (otherLoss / 100);
    const finalYield = afterClass - otherLossVal;

    return [
      {
        name: "Produtividade\na campo",
        value: fieldYield,
        base: 0,
        fill: "#22c55e",
        isTotal: true,
      },
      {
        name: "Perda de\numidade",
        value: -moistureLoss,
        base: fieldYield - moistureLoss,
        fill: "#f97316",
        isTotal: false,
        loss: moistureLoss,
      },
      {
        name: "Perda palha\ne sabugo",
        value: -dehuskLoss,
        base: afterMoisture - dehuskLoss,
        fill: "#ef4444",
        isTotal: false,
        loss: dehuskLoss,
      },
      {
        name: "Perda\nclassificação",
        value: -classLoss,
        base: afterClass,
        fill: "#dc2626",
        isTotal: false,
        loss: classLoss,
      },
      {
        name: "Outras\nperdas",
        value: -otherLossVal,
        base: finalYield,
        fill: "#b91c1c",
        isTotal: false,
        loss: otherLossVal,
      },
      {
        name: "Volume\nfinal",
        value: finalYield,
        base: 0,
        fill: "#16a34a",
        isTotal: true,
      },
    ];
  }, [avgEarsPerHa, avgKernelsPerEar, tgw, avgMoisture, moistureRef, dehuskingLoss, classificationLoss, otherLoss]);

  const fieldYield = data[0].value;
  const finalYield = data[data.length - 1].value;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Waterfall — Produtividade de Campo → Volume Final</CardTitle>
        <p className="text-xs text-muted-foreground">
          De {Math.round(fieldYield).toLocaleString()} kg/ha (espiga úmida) para{" "}
          {Math.round(finalYield).toLocaleString()} kg/ha (semente limpa)
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 20, right: 20, left: 20, bottom: 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                interval={0}
                height={50}
              />
              <YAxis
                tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}k`}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                formatter={(value: number, name: string, props: any) => {
                  const item = props.payload;
                  if (item.isTotal) {
                    return [`${Math.round(Math.abs(value)).toLocaleString()} kg/ha`, "Valor"];
                  }
                  return [`-${Math.round(item.loss).toLocaleString()} kg/ha`, "Perda"];
                }}
                labelFormatter={(label: string) => label.replace("\n", " ")}
              />
              {/* Invisible base bar */}
              <Bar dataKey="base" stackId="waterfall" fill="transparent" />
              {/* Visible bar on top */}
              <Bar dataKey={(entry: any) => Math.abs(entry.value)} stackId="waterfall" radius={[4, 4, 0, 0]}>
                {data.map((entry, idx) => (
                  <Cell key={idx} fill={entry.fill} />
                ))}
                <LabelList
                  content={({ x, y, width, index }: any) => {
                    const entry = data[index];
                    const displayVal = entry.isTotal
                      ? Math.round(entry.value).toLocaleString()
                      : `-${Math.round(entry.loss).toLocaleString()}`;
                    return (
                      <text
                        x={(x as number) + (width as number) / 2}
                        y={(y as number) - 6}
                        textAnchor="middle"
                        fontSize={11}
                        fontWeight="bold"
                        fill={entry.isTotal ? "#16a34a" : "#dc2626"}
                      >
                        {displayVal}
                      </text>
                    );
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
