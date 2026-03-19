import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from "recharts";
import { format, parseISO } from "date-fns";
import type { RoguingEvaluation, RoguingExecution } from "./types";
import { getFrequencyLevel } from "./types";

interface Props {
  evaluations: RoguingEvaluation[];
  executions: RoguingExecution[];
}

const COLORS = {
  volunteers: "#4CAF50",
  offtype: "#FF9800",
  diseased: "#F44336",
  female_in_male: "#9C27B0",
};

export default function RoguingCharts({ evaluations, executions }: Props) {
  const lineData = useMemo(() => {
    return [...evaluations].reverse().map(e => ({
      date: format(parseISO(e.evaluation_date), "dd/MM"),
      volunteers: e.has_volunteers ? getFrequencyLevel(e.volunteers_frequency) : 0,
      offtype: e.has_offtype ? getFrequencyLevel(e.offtype_frequency) : 0,
      diseased: e.has_diseased ? getFrequencyLevel(e.diseased_frequency) : 0,
      female_in_male: e.has_female_in_male ? getFrequencyLevel(e.female_in_male_frequency) : 0,
    }));
  }, [evaluations]);

  const pieData = useMemo(() => {
    const counts = { volunteers: 0, offtype: 0, diseased: 0, female_in_male: 0 };
    evaluations.forEach(e => {
      if (e.has_volunteers) counts.volunteers++;
      if (e.has_offtype) counts.offtype++;
      if (e.has_diseased) counts.diseased++;
      if (e.has_female_in_male) counts.female_in_male++;
    });
    return Object.entries(counts)
      .filter(([_, v]) => v > 0)
      .map(([key, value]) => ({
        name: { volunteers: "Voluntárias", offtype: "Off-type", diseased: "Doentes", female_in_male: "Fêmea no macho" }[key] ?? key,
        value,
        color: COLORS[key as keyof typeof COLORS],
      }));
  }, [evaluations]);

  const barData = useMemo(() => {
    return executions.map(e => ({
      date: format(parseISO(e.execution_date), "dd/MM"),
      volunteers: e.volunteers_removed,
      offtype: e.offtype_removed,
      diseased: e.diseased_removed,
      female_in_male: e.female_in_male_removed,
      total: e.total_plants_removed,
    }));
  }, [executions]);

  if (evaluations.length === 0 && executions.length === 0) return null;

  const freqLabels: Record<number, string> = { 0: "Nenhuma", 1: "Rara", 2: "Baixa", 3: "Moderada", 4: "Alta" };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">📊 Gráficos</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {lineData.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Evolução de Ocorrências</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 4]} ticks={[0,1,2,3,4]} tickFormatter={(v) => freqLabels[v] ?? ""} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => freqLabels[v] ?? v} />
                  <Legend />
                  <Line type="monotone" dataKey="volunteers" stroke={COLORS.volunteers} name="Voluntárias" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="offtype" stroke={COLORS.offtype} name="Off-type" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="diseased" stroke={COLORS.diseased} name="Doentes" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="female_in_male" stroke={COLORS.female_in_male} name="Fêmea no macho" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {pieData.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Distribuição de Ocorrências</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {barData.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Plantas Removidas por Execução</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="volunteers" stackId="a" fill={COLORS.volunteers} name="Voluntárias" />
                  <Bar dataKey="offtype" stackId="a" fill={COLORS.offtype} name="Off-type" />
                  <Bar dataKey="diseased" stackId="a" fill={COLORS.diseased} name="Doentes" />
                  <Bar dataKey="female_in_male" stackId="a" fill={COLORS.female_in_male} name="Fêmea no macho" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
