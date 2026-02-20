import { useState, useMemo, useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Circle, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin } from "lucide-react";

// ── Tile layers ──
const TILES = {
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
  },
  osm: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  labels: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
    attribution: "Labels &copy; Esri",
  },
};

type TileMode = "satellite" | "osm" | "satellite_labels";

interface LayerConfig {
  key: string;
  label: string;
  emoji: string;
  color: string;
}

const LAYERS: LayerConfig[] = [
  { key: "pivot", label: "Pivô", emoji: "📍", color: "#3b82f6" },
  { key: "moisture", label: "Umidade", emoji: "💧", color: "#ef4444" },
  { key: "nicking", label: "Nicking PF", emoji: "🌺", color: "#22c55e" },
  { key: "applications", label: "Aplicações", emoji: "🧪", color: "#eab308" },
  { key: "pests", label: "Pragas", emoji: "🐛", color: "#92400e" },
  { key: "yield", label: "Estimativa", emoji: "🌾", color: "#8b5cf6" },
];

function getMoistureColor(pct: number): string {
  if (pct > 25) return "#ef4444";
  if (pct > 20) return "#f97316";
  if (pct > 18) return "#eab308";
  return "#22c55e";
}

function coloredIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -10],
  });
}

function CenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => { map.setView([lat, lng], 15); }, [lat, lng, map]);
  return null;
}

interface CycleMapTabProps {
  cycleId: string;
  orgId: string;
  pivotId?: string;
}

export default function CycleMapTab({ cycleId, orgId, pivotId }: CycleMapTabProps) {
  const [tileMode, setTileMode] = useState<TileMode>("satellite");
  const [activeLayers, setActiveLayers] = useState<Set<string>>(new Set(["pivot", "moisture", "nicking"]));

  const toggleLayer = (key: string) => {
    setActiveLayers(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // Fetch pivot coordinates
  const { data: pivot } = useQuery({
    queryKey: ["cycle-pivot", pivotId],
    enabled: !!pivotId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("pivots")
        .select("latitude, longitude, area_ha, name")
        .eq("id", pivotId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch moisture samples
  const { data: moistureSamples = [] } = useQuery({
    queryKey: ["cycle-map-moisture", cycleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("moisture_samples")
        .select("id, latitude, longitude, moisture_pct, sample_date, method, point_identifier")
        .eq("cycle_id", cycleId)
        .is("deleted_at", null)
        .order("sample_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch nicking fixed points
  const { data: nickingPoints = [] } = useQuery({
    queryKey: ["cycle-map-nicking", cycleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("nicking_fixed_points")
        .select("id, latitude, longitude, name, parent_type")
        .eq("cycle_id", cycleId)
        .is("deleted_at", null);
      if (error) throw error;
      return data;
    },
  });

  // Fetch chemical applications with coords
  const { data: applications = [] } = useQuery({
    queryKey: ["cycle-map-apps", cycleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("chemical_applications")
        .select("id, gps_latitude, gps_longitude, application_date, product_name, application_type, area_applied_ha")
        .eq("cycle_id", cycleId)
        .is("deleted_at", null)
        .not("gps_latitude", "is", null);
      if (error) throw error;
      return data;
    },
  });

  // Fetch pest records with coords
  const { data: pests = [] } = useQuery({
    queryKey: ["cycle-map-pests", cycleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("pest_disease_records")
        .select("id, latitude, longitude, record_date, pest_name, severity")
        .eq("cycle_id", cycleId)
        .is("deleted_at", null)
        .not("latitude", "is", null);
      if (error) throw error;
      return data;
    },
  });

  // Fetch yield sample points
  const { data: yieldPoints = [] } = useQuery({
    queryKey: ["cycle-map-yield", cycleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("yield_sample_points")
        .select("id, latitude, longitude, point_number, row_count, ear_weight_avg")
        .eq("cycle_id", cycleId)
        .is("deleted_at", null)
        .not("latitude", "is", null);
      if (error) throw error;
      return data;
    },
  });

  const hasCoords = pivot?.latitude != null && pivot?.longitude != null;
  const center: [number, number] = hasCoords ? [pivot.latitude, pivot.longitude] : [-15.8, -47.9];

  const nickingParentColors: Record<string, string> = {
    male1: "#22c55e",
    male2: "#f97316",
    male3: "#8b5cf6",
    female: "#3b82f6",
  };

  if (!hasCoords) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <MapPin className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-medium">Pivô sem coordenadas cadastradas</p>
          <p className="text-xs text-muted-foreground mt-1">Cadastre latitude e longitude no pivô para visualizar o mapa.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Layer toggles */}
      <div className="flex flex-wrap gap-2">
        {LAYERS.map(layer => (
          <button
            key={layer.key}
            onClick={() => toggleLayer(layer.key)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${
              activeLayers.has(layer.key)
                ? "bg-primary/10 border-primary/30 text-primary"
                : "bg-muted/50 border-border text-muted-foreground"
            }`}
          >
            <span>{layer.emoji}</span>
            {layer.label}
            {layer.key === "moisture" && moistureSamples.length > 0 && (
              <Badge variant="secondary" className="h-4 px-1 text-[10px]">{moistureSamples.length}</Badge>
            )}
            {layer.key === "nicking" && nickingPoints.length > 0 && (
              <Badge variant="secondary" className="h-4 px-1 text-[10px]">{nickingPoints.length}</Badge>
            )}
          </button>
        ))}
      </div>

      {/* Map */}
      <Card className="overflow-hidden">
        <CardContent className="p-0 relative">
          <div className="h-[calc(100vh-380px)] min-h-[400px]">
            <MapContainer center={center} zoom={15} className="h-full w-full z-0" minZoom={4} maxZoom={18}>
              <CenterMap lat={center[0]} lng={center[1]} />

              {(tileMode === "satellite" || tileMode === "satellite_labels") && (
                <TileLayer url={TILES.satellite.url} attribution={TILES.satellite.attribution} />
              )}
              {tileMode === "osm" && (
                <TileLayer url={TILES.osm.url} attribution={TILES.osm.attribution} />
              )}
              {tileMode === "satellite_labels" && (
                <TileLayer url={TILES.labels.url} attribution={TILES.labels.attribution} />
              )}

              {/* Pivot circle */}
              {activeLayers.has("pivot") && pivot?.area_ha && (
                <Circle
                  center={center}
                  radius={Math.sqrt((pivot.area_ha * 10000) / Math.PI)}
                  pathOptions={{
                    color: "#3b82f6",
                    weight: 2,
                    fillColor: "#3b82f6",
                    fillOpacity: 0.15,
                  }}
                />
              )}

              {/* Moisture samples */}
              {activeLayers.has("moisture") && moistureSamples.map((s: any) => (
                <Marker key={`m-${s.id}`} position={[s.latitude, s.longitude]} icon={coloredIcon(getMoistureColor(s.moisture_pct))}>
                  <Popup>
                    <div className="text-xs space-y-0.5">
                      <div className="font-bold">💧 Umidade: {s.moisture_pct?.toFixed(1)}%</div>
                      <div>Data: {s.sample_date}</div>
                      <div>Método: {s.method}</div>
                      {s.point_identifier && <div>Ponto: {s.point_identifier}</div>}
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Nicking points */}
              {activeLayers.has("nicking") && nickingPoints.map((p: any) => (
                <Marker key={`n-${p.id}`} position={[p.latitude, p.longitude]} icon={coloredIcon(nickingParentColors[p.parent_type] || "#22c55e")}>
                  <Popup>
                    <div className="text-xs space-y-0.5">
                      <div className="font-bold">🌺 {p.name}</div>
                      <div>Tipo: {p.parent_type}</div>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Chemical applications */}
              {activeLayers.has("applications") && applications.map((a: any) => (
                <Marker key={`a-${a.id}`} position={[a.gps_latitude, a.gps_longitude]} icon={coloredIcon("#eab308")}>
                  <Popup>
                    <div className="text-xs space-y-0.5">
                      <div className="font-bold">🧪 {a.product_name}</div>
                      <div>Tipo: {a.application_type}</div>
                      <div>Data: {a.application_date}</div>
                      <div>Área: {a.area_applied_ha} ha</div>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Pests */}
              {activeLayers.has("pests") && pests.map((p: any) => (
                <Marker key={`p-${p.id}`} position={[p.latitude, p.longitude]} icon={coloredIcon("#92400e")}>
                  <Popup>
                    <div className="text-xs space-y-0.5">
                      <div className="font-bold">🐛 {p.pest_name}</div>
                      <div>Severidade: {p.severity}</div>
                      <div>Data: {p.record_date}</div>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Yield points */}
              {activeLayers.has("yield") && yieldPoints.map((y: any) => (
                <Marker key={`y-${y.id}`} position={[y.latitude, y.longitude]} icon={coloredIcon("#8b5cf6")}>
                  <Popup>
                    <div className="text-xs space-y-0.5">
                      <div className="font-bold">🌾 Ponto #{y.point_number}</div>
                      {y.row_count && <div>Fileiras: {y.row_count}</div>}
                      {y.ear_weight_avg && <div>Peso médio espiga: {y.ear_weight_avg}g</div>}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>

            {/* Tile mode controls */}
            <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-1">
              {([
                ["satellite", "🛰️ Satélite"],
                ["osm", "🗺️ Mapa"],
                ["satellite_labels", "🛰️+🏷️"],
              ] as [TileMode, string][]).map(([mode, label]) => (
                <button
                  key={mode}
                  onClick={() => setTileMode(mode)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded shadow-md transition-colors ${
                    tileMode === mode
                      ? "bg-primary text-primary-foreground"
                      : "bg-background/90 text-foreground hover:bg-background"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Legend */}
            <div className="absolute bottom-3 left-3 z-[1000] bg-background/85 backdrop-blur-sm rounded-lg p-2 shadow-md">
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px]">
                {activeLayers.has("moisture") && (
                  <>
                    <span className="font-semibold text-muted-foreground">Umidade:</span>
                    {[
                      { color: "#ef4444", label: ">25%" },
                      { color: "#f97316", label: "20-25%" },
                      { color: "#eab308", label: "18-20%" },
                      { color: "#22c55e", label: "<18%" },
                    ].map(i => (
                      <span key={i.label} className="inline-flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ background: i.color }} />{i.label}
                      </span>
                    ))}
                  </>
                )}
                {activeLayers.has("nicking") && (
                  <>
                    <span className="border-l border-border pl-2 font-semibold text-muted-foreground">Nicking:</span>
                    {Object.entries(nickingParentColors).map(([k, c]) => (
                      <span key={k} className="inline-flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ background: c }} />{k}
                      </span>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
