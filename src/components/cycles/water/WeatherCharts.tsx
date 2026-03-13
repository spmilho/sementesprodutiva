import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area,
} from "recharts";
import { Thermometer, Droplets, Wind, Sun } from "lucide-react";

interface WeatherRecord {
  id: string;
  record_date: string;
  temp_max_c: number | null;
  temp_min_c: number | null;
  temp_avg_c: number | null;
  humidity_max_pct: number | null;
  humidity_min_pct: number | null;
  humidity_avg_pct: number | null;
  wind_max_kmh: number | null;
  wind_avg_kmh: number | null;
  radiation_mj: number | null;
  eto_mm: number | null;
  precipitation_mm: number | null;
}

interface Props {
  records: WeatherRecord[];
}

export default function WeatherCharts({ records }: Props) {
  const sortedData = useMemo(() => {
    return [...records]
      .sort((a, b) => a.record_date.localeCompare(b.record_date))
      .map(r => ({
        ...r,
        dateLabel: new Date(r.record_date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      }));
  }, [records]);

  const stats = useMemo(() => {
    if (records.length === 0) return null;
    const temps = records.filter(r => r.temp_avg_c != null).map(r => r.temp_avg_c!);
    const humids = records.filter(r => r.humidity_avg_pct != null).map(r => r.humidity_avg_pct!);
    const winds = records.filter(r => r.wind_avg_kmh != null).map(r => r.wind_avg_kmh!);
    const etos = records.filter(r => r.eto_mm != null).map(r => r.eto_mm!);
    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    return {
      avgTemp: avg(temps),
      maxTemp: temps.length > 0 ? Math.max(...records.filter(r => r.temp_max_c != null).map(r => r.temp_max_c!)) : 0,
      minTemp: temps.length > 0 ? Math.min(...records.filter(r => r.temp_min_c != null).map(r => r.temp_min_c!)) : 0,
      avgHumidity: avg(humids),
      avgWind: avg(winds),
      totalEto: etos.reduce((a, b) => a + b, 0),
      totalPrecip: records.filter(r => r.precipitation_mm != null).reduce((a, r) => a + r.precipitation_mm!, 0),
      days: records.length,
    };
  }, [records]);

  if (records.length === 0) return null;

  const hasTemp = sortedData.some(r => r.temp_max_c != null || r.temp_min_c != null);
  const hasHumidity = sortedData.some(r => r.humidity_avg_pct != null);
  const hasWind = sortedData.some(r => r.wind_avg_kmh != null);
  const hasEto = sortedData.some(r => r.eto_mm != null);

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-sm flex items-center gap-2">
        <Sun className="h-4 w-4" />
        Dados Meteorológicos ({stats?.days} dias)
      </h3>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Card><CardContent className="p-3 flex items-center gap-2">
            <Thermometer className="h-6 w-6 text-red-500 shrink-0" />
            <div><p className="text-[10px] text-muted-foreground">Temp. Média</p><p className="text-sm font-bold">{stats.avgTemp.toFixed(1)}°C</p><p className="text-[10px] text-muted-foreground">{stats.minTemp.toFixed(1)} — {stats.maxTemp.toFixed(1)}</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-3 flex items-center gap-2">
            <Droplets className="h-6 w-6 text-blue-500 shrink-0" />
            <div><p className="text-[10px] text-muted-foreground">UR Média</p><p className="text-sm font-bold">{stats.avgHumidity.toFixed(0)}%</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-3 flex items-center gap-2">
            <Wind className="h-6 w-6 text-gray-500 shrink-0" />
            <div><p className="text-[10px] text-muted-foreground">Vento Médio</p><p className="text-sm font-bold">{stats.avgWind.toFixed(1)} km/h</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-3 flex items-center gap-2">
            <Sun className="h-6 w-6 text-yellow-500 shrink-0" />
            <div><p className="text-[10px] text-muted-foreground">ETo Total</p><p className="text-sm font-bold">{stats.totalEto.toFixed(1)} mm</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-3 flex items-center gap-2">
            <Droplets className="h-6 w-6 text-blue-800 shrink-0" />
            <div><p className="text-[10px] text-muted-foreground">Precip. Total</p><p className="text-sm font-bold">{stats.totalPrecip.toFixed(1)} mm</p></div>
          </CardContent></Card>
        </div>
      )}

      {/* Temperature chart */}
      {hasTemp && (
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium text-xs mb-2">Temperatura (°C)</h4>
            <ResponsiveContainer width="100%" height={250}>
              <ComposedChart data={sortedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dateLabel" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="temp_max_c" name="Máx" fill="hsl(0 70% 90%)" stroke="hsl(0 70% 50%)" fillOpacity={0.3} />
                <Area type="monotone" dataKey="temp_min_c" name="Mín" fill="hsl(210 70% 90%)" stroke="hsl(210 70% 50%)" fillOpacity={0.3} />
                <Line type="monotone" dataKey="temp_avg_c" name="Média" stroke="hsl(30 80% 50%)" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Humidity chart */}
      {hasHumidity && (
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium text-xs mb-2">Umidade Relativa (%)</h4>
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={sortedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dateLabel" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} domain={[0, 100]} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="humidity_max_pct" name="UR Máx" fill="hsl(200 60% 85%)" stroke="hsl(200 60% 45%)" fillOpacity={0.3} />
                <Area type="monotone" dataKey="humidity_min_pct" name="UR Mín" fill="hsl(40 60% 85%)" stroke="hsl(40 60% 45%)" fillOpacity={0.3} />
                <Line type="monotone" dataKey="humidity_avg_pct" name="UR Média" stroke="hsl(200 80% 40%)" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Wind + ETo + Precipitation chart */}
      {(hasWind || hasEto) && (
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium text-xs mb-2">Vento, ETo e Precipitação</h4>
            <ResponsiveContainer width="100%" height={250}>
              <ComposedChart data={sortedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dateLabel" tick={{ fontSize: 9 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 9 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {hasEto && <Bar yAxisId="left" dataKey="eto_mm" name="ETo (mm)" fill="hsl(45 80% 55%)" radius={[2, 2, 0, 0]} />}
                <Bar yAxisId="left" dataKey="precipitation_mm" name="Chuva (mm)" fill="hsl(210 70% 55%)" radius={[2, 2, 0, 0]} />
                {hasWind && <Line yAxisId="right" type="monotone" dataKey="wind_avg_kmh" name="Vento (km/h)" stroke="hsl(0 0% 50%)" strokeWidth={1.5} dot={false} />}
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
