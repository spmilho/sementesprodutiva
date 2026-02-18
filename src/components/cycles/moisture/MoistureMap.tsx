import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MoistureSample, PivotGleba, METHOD_LABELS, POSITION_LABELS, GROWTH_STAGE_LABELS } from "./types";
import { getMoistureColor } from "./utils";

interface Props {
  samples: MoistureSample[];
  glebas: PivotGleba[];
  target: number;
  pivotLat?: number;
  pivotLng?: number;
  pivotName: string;
}

function createMoistureIcon(moisture: number, target: number) {
  const color = getMoistureColor(moisture, target);
  const colorMap: Record<string, string> = {
    green: "#22c55e",
    yellow: "#eab308",
    orange: "#f97316",
    red: "#ef4444",
  };
  const bg = colorMap[color] ?? "#6b7280";
  return L.divIcon({
    className: "",
    html: `<div style="background:${bg};color:#fff;font-size:10px;font-weight:700;padding:2px 5px;border-radius:12px;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3);white-space:nowrap;text-align:center;min-width:32px;">${moisture.toFixed(1)}</div>`,
    iconSize: [40, 24],
    iconAnchor: [20, 12],
  });
}

const pivotIcon = L.divIcon({
  className: "",
  html: `<div style="background:#1e3a5f;color:#fff;font-size:12px;font-weight:700;padding:4px 8px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4);width:32px;height:32px;display:flex;align-items:center;justify-content:center;">📍</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

export default function MoistureMap({ samples, glebas, target, pivotLat, pivotLng, pivotName }: Props) {
  const [glebaFilter, setGlebaFilter] = useState("__all__");
  const [dateFilter, setDateFilter] = useState("__all__");

  const filtered = useMemo(() => {
    let s = [...samples];
    if (glebaFilter !== "__all__") {
      s = s.filter((x) => (glebaFilter === "__none__" ? !x.gleba_id : x.gleba_id === glebaFilter));
    }
    if (dateFilter === "__latest__") {
      const maxDate = s.reduce((m, x) => (x.sample_date > m ? x.sample_date : m), "");
      s = s.filter((x) => x.sample_date === maxDate);
    }
    return s;
  }, [samples, glebaFilter, dateFilter]);

  const center = useMemo(() => {
    if (pivotLat && pivotLng) return [pivotLat, pivotLng] as [number, number];
    if (filtered.length > 0) return [Number(filtered[0].latitude), Number(filtered[0].longitude)] as [number, number];
    return [-15.79, -47.88] as [number, number];
  }, [pivotLat, pivotLng, filtered]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm">Mapa de Umidade</CardTitle>
          <div className="flex gap-2">
            <Select value={glebaFilter} onValueChange={setGlebaFilter}>
              <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas as glebas</SelectItem>
                {glebas.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas as datas</SelectItem>
                <SelectItem value="__latest__">Última amostragem</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div style={{ height: 500 }}>
          <MapContainer center={center} zoom={15} style={{ width: "100%", height: "100%" }} scrollWheelZoom>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OSM" />
            {pivotLat && pivotLng && (
              <Marker position={[pivotLat, pivotLng]} icon={pivotIcon}>
                <Popup>{pivotName}</Popup>
              </Marker>
            )}
            {filtered.map((s) => (
              <Marker
                key={s.id}
                position={[Number(s.latitude), Number(s.longitude)]}
                icon={createMoistureIcon(Number(s.moisture_pct), target)}
              >
                <Popup>
                  <div className="text-xs space-y-0.5">
                    <p className="font-semibold">{s.point_identifier ?? "Ponto"} — {new Date(s.sample_date + "T00:00:00").toLocaleDateString("pt-BR")} {s.sample_time?.slice(0, 5)}</p>
                    <p>Umidade: <strong>{Number(s.moisture_pct).toFixed(1)}%</strong></p>
                    {s.growth_stage && <p>Estádio: {GROWTH_STAGE_LABELS[s.growth_stage] ?? s.growth_stage}</p>}
                    <p>Método: {METHOD_LABELS[s.method] ?? s.method}</p>
                    {s.field_position && <p>Posição: {POSITION_LABELS[s.field_position] ?? s.field_position}</p>}
                    {s.gleba_name && <p>Gleba: {s.gleba_name}</p>}
                    <p className="text-muted-foreground">{Number(s.latitude).toFixed(5)}, {Number(s.longitude).toFixed(5)}</p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
        <div className="flex gap-3 p-2 text-xs text-muted-foreground flex-wrap">
          <span>🟢 ≤{target}%</span>
          <span>🟡 {target}-{target + 3}%</span>
          <span>🟠 {target + 3}-{target + 7}%</span>
          <span>🔴 &gt;{target + 7}%</span>
          <span>📍 Pivô</span>
        </div>
      </CardContent>
    </Card>
  );
}
