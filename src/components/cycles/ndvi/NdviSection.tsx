import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, fromUnixTime, getUnixTime, subDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Satellite, RefreshCw, MapPin, TrendingUp, Eye } from "lucide-react";
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Tooltip as RTooltip, ReferenceLine, Legend, Area,
} from "recharts";
import { MapContainer, TileLayer, ImageOverlay, Polygon as LeafletPolygon } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const API_KEY = "13ab2c8b70045ba0a48a6fd8f69e8f4b";

async function ndviProxy(action: string, payload: any) {
  const { data, error } = await supabase.functions.invoke("ndvi-proxy", {
    body: { action, payload },
  });
  if (error) throw new Error(error.message || "Erro na requisição NDVI");
  if (data?.error) throw new Error(data.error);
  return data;
}

// Phenology stage colors for chart markers
const STAGE_COLORS: Record<string, string> = {
  VE: "#4CAF50", V2: "#66BB6A", V4: "#81C784", V6: "#A5D6A7",
  V8: "#90CAF9", V10: "#64B5F6", V12: "#42A5F5",
  VT: "#FF9800", R1: "#F44336", R2: "#E91E63", R3: "#CE93D8",
  R4: "#AB47BC", R5: "#7B1FA2", R6: "#9C27B0",
};

interface NdviSectionProps {
  cycleId: string;
  orgId: string;
  pivotId?: string;
  pivotName: string;
  phenologyRecords: any[];
}

interface SatImage {
  dt: number;
  type: number;
  dc: number;
  cl: number;
  sun: { azimuth: number; elevation: number };
  image: {
    truecolor: string;
    falsecolor: string;
    ndvi: string;
    evi: string;
  };
  tile: { ndvi: string; truecolor: string; falsecolor: string };
  stats: { ndvi: string };
  data: { ndvi: string; truecolor: string; falsecolor: string };
}

interface NdviStats {
  std: number;
  p25: number;
  num: number;
  min: number;
  max: number;
  median: number;
  p75: number;
  mean: number;
}

export default function NdviSection({
  cycleId, orgId, pivotId, pivotName, phenologyRecords,
}: NdviSectionProps) {
  const queryClient = useQueryClient();
  const [opacity, setOpacity] = useState(70);
  const [layerType, setLayerType] = useState<"ndvi" | "truecolor" | "falsecolor">("ndvi");
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");

  // Fetch stored polygon
  const { data: polygon, isLoading: polygonLoading } = useQuery({
    queryKey: ["ndvi-polygon", cycleId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("ndvi_polygons")
        .select("*")
        .eq("cycle_id", cycleId)
        .is("deleted_at", null)
        .single();
      return data;
    },
  });

  // Fetch pivot coordinates
  const { data: pivot } = useQuery({
    queryKey: ["pivot-coords", pivotId],
    queryFn: async () => {
      if (!pivotId) return null;
      const { data } = await (supabase as any)
        .from("pivots")
        .select("latitude, longitude, area_ha, name")
        .eq("id", pivotId)
        .single();
      return data;
    },
    enabled: !!pivotId,
  });

  // Create polygon on Agromonitoring
  const createPolygonMut = useMutation({
    mutationFn: async ({ lat, lng }: { lat: number; lng: number }) => {
      const offset = 0.004;
      const geoJson = {
        type: "Feature",
        properties: { name: pivotName },
        geometry: {
          type: "Polygon",
          coordinates: [[
            [lng - offset, lat - offset],
            [lng + offset, lat - offset],
            [lng + offset, lat + offset],
            [lng - offset, lat + offset],
            [lng - offset, lat - offset],
          ]],
        },
      };

      const agroData = await ndviProxy("create_polygon", {
        name: `${pivotName} - ${cycleId.slice(0, 8)}`,
        geo_json: geoJson,
      });

      const { error } = await (supabase as any).from("ndvi_polygons").insert({
        cycle_id: cycleId,
        org_id: orgId,
        agro_polygon_id: agroData.id,
        polygon_name: pivotName,
        polygon_geo: geoJson,
        area_ha: agroData.area ? (agroData.area / 10000).toFixed(2) : null,
      });
      if (error) throw error;
      return agroData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ndvi-polygon", cycleId] });
      toast.success("Polígono NDVI configurado!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Fetch satellite images
  const { data: satImages = [], isLoading: imagesLoading, refetch: refetchImages } = useQuery({
    queryKey: ["ndvi-images", polygon?.agro_polygon_id],
    queryFn: async () => {
      if (!polygon?.agro_polygon_id) return [];
      const end = getUnixTime(new Date());
      const start = getUnixTime(subDays(new Date(), 180));
      const data: SatImage[] = await ndviProxy("search_images", {
        polyid: polygon.agro_polygon_id,
        start,
        end,
      });
      return data.sort((a, b) => b.dt - a.dt);
    },
    enabled: !!polygon?.agro_polygon_id,
    staleTime: 1000 * 60 * 30,
  });

  // Fetch NDVI stats for each image
  const { data: ndviTimeline = [] } = useQuery({
    queryKey: ["ndvi-stats", polygon?.agro_polygon_id, satImages.length],
    queryFn: async () => {
      if (satImages.length === 0) return [];
      // Get stats for up to 30 most recent images
      const imagesToFetch = satImages.slice(0, 30);
      const results = await Promise.all(
        imagesToFetch.map(async (img) => {
          try {
            const stats: NdviStats = await ndviProxy("get_stats", { url: img.stats.ndvi });
            return { dt: img.dt, ...stats };
          } catch {
            return { dt: img.dt, mean: null, min: null, max: null, median: null };
          }
        })
      );
      return results.filter(r => r.mean !== null).sort((a, b) => a.dt - b.dt);
    },
    enabled: satImages.length > 0,
    staleTime: 1000 * 60 * 60,
  });

  // Auto-setup polygon if pivot has coordinates
  const canAutoSetup = pivot?.latitude && pivot?.longitude && !polygon && !polygonLoading;

  const handleSetupPolygon = useCallback(() => {
    const lat = manualLat ? parseFloat(manualLat) : pivot?.latitude;
    const lng = manualLng ? parseFloat(manualLng) : pivot?.longitude;
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
      toast.error("Coordenadas inválidas");
      return;
    }
    createPolygonMut.mutate({ lat, lng });
  }, [pivot, manualLat, manualLng, createPolygonMut]);

  // Selected image data
  const selectedImage = satImages[selectedImageIdx];
  const currentNdvi = ndviTimeline[ndviTimeline.length - 1];
  const previousNdvi = ndviTimeline.length > 1 ? ndviTimeline[ndviTimeline.length - 2] : null;
  const maxNdvi = ndviTimeline.length > 0
    ? ndviTimeline.reduce((max, v) => (v.mean || 0) > (max.mean || 0) ? v : max, ndviTimeline[0])
    : null;

  // Chart data with phenology markers
  const chartData = useMemo(() => {
    return ndviTimeline.map((point) => ({
      date: format(fromUnixTime(point.dt), "dd/MM"),
      rawDate: fromUnixTime(point.dt),
      mean: point.mean ? Number(Number(point.mean).toFixed(3)) : null,
      min: point.min ? Number(Number(point.min).toFixed(3)) : null,
      max: point.max ? Number(Number(point.max).toFixed(3)) : null,
    }));
  }, [ndviTimeline]);

  // Unique phenology dates for reference lines
  const phenologyMarkers = useMemo(() => {
    const markers: { date: string; stage: string; color: string }[] = [];
    const seen = new Set<string>();
    for (const r of phenologyRecords) {
      const key = `${r.stage}-${r.type}`;
      if (!seen.has(key)) {
        seen.add(key);
        markers.push({
          date: format(new Date(r.observation_date + "T12:00:00"), "dd/MM"),
          stage: r.stage,
          color: STAGE_COLORS[r.stage] || "#999",
        });
      }
    }
    return markers;
  }, [phenologyRecords]);

  // Polygon bounds for map
  const bounds = useMemo(() => {
    if (!polygon?.polygon_geo?.geometry?.coordinates?.[0]) return null;
    const coords = polygon.polygon_geo.geometry.coordinates[0];
    const lats = coords.map((c: number[]) => c[1]);
    const lngs = coords.map((c: number[]) => c[0]);
    return [
      [Math.min(...lats), Math.min(...lngs)] as [number, number],
      [Math.max(...lats), Math.max(...lngs)] as [number, number],
    ] as [[number, number], [number, number]];
  }, [polygon]);

  const leafletCoords = useMemo(() => {
    if (!polygon?.polygon_geo?.geometry?.coordinates?.[0]) return [];
    return polygon.polygon_geo.geometry.coordinates[0].map((c: number[]) => [c[1], c[0]] as [number, number]);
  }, [polygon]);

  // ── RENDER ──

  if (polygonLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  // Setup polygon view
  if (!polygon) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Satellite className="h-4 w-4" /> Configurar Monitoramento NDVI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Para ativar o monitoramento por satélite, é necessário definir o polígono da área.
            {pivot?.latitude && pivot?.longitude
              ? ` As coordenadas do pivô (${pivot.latitude.toFixed(4)}, ${pivot.longitude.toFixed(4)}) serão usadas para criar o polígono automaticamente.`
              : " Informe as coordenadas centrais do campo."}
          </p>
          {(!pivot?.latitude || !pivot?.longitude) && (
            <div className="flex gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Latitude</label>
                <Input type="number" step="any" value={manualLat} onChange={(e) => setManualLat(e.target.value)} placeholder="-15.7942" className="h-8 w-36 text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Longitude</label>
                <Input type="number" step="any" value={manualLng} onChange={(e) => setManualLng(e.target.value)} placeholder="-47.8825" className="h-8 w-36 text-sm" />
              </div>
            </div>
          )}
          <Button onClick={handleSetupPolygon} disabled={createPolygonMut.isPending} className="gap-2">
            {createPolygonMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            <Satellite className="h-4 w-4" /> Configurar Polígono
          </Button>
        </CardContent>
      </Card>
    );
  }

  const tileUrl = selectedImage
    ? `${selectedImage.tile[layerType]}&appid=${API_KEY}`
    : null;

  return (
    <div className="space-y-6">
      {/* NDVI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <NdviCard
          title="NDVI Atual"
          value={currentNdvi?.mean != null ? Number(currentNdvi.mean).toFixed(3) : "—"}
          subtitle={currentNdvi ? format(fromUnixTime(currentNdvi.dt), "dd/MM/yyyy") : undefined}
          color={getNdviColor(currentNdvi?.mean)}
        />
        <NdviCard
          title="NDVI Anterior"
          value={previousNdvi?.mean != null ? Number(previousNdvi.mean).toFixed(3) : "—"}
          subtitle={previousNdvi ? format(fromUnixTime(previousNdvi.dt), "dd/MM/yyyy") : undefined}
          trend={currentNdvi && previousNdvi ? (currentNdvi.mean || 0) - (previousNdvi.mean || 0) : undefined}
        />
        <NdviCard
          title="NDVI Máximo"
          value={maxNdvi?.mean != null ? Number(maxNdvi.mean).toFixed(3) : "—"}
          subtitle={maxNdvi ? format(fromUnixTime(maxNdvi.dt), "dd/MM/yyyy") : undefined}
          color="#4CAF50"
        />
        <NdviCard
          title="Imagens Disponíveis"
          value={`${satImages.length}`}
          subtitle="Últimos 180 dias"
          icon={<Eye className="h-4 w-4" />}
        />
      </div>

      {/* Map with NDVI overlay */}
      {bounds && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base">Mapa NDVI</CardTitle>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {(["ndvi", "truecolor", "falsecolor"] as const).map((t) => (
                    <Button key={t} size="sm" variant={layerType === t ? "default" : "outline"} className="text-xs h-7"
                      onClick={() => setLayerType(t)}>
                      {t === "ndvi" ? "NDVI" : t === "truecolor" ? "Cor Real" : "Falsa Cor"}
                    </Button>
                  ))}
                </div>
                <Button size="sm" variant="outline" className="h-7" onClick={() => refetchImages()}>
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </div>
            </div>
            {satImages.length > 1 && (
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {selectedImage ? format(fromUnixTime(selectedImage.dt), "dd/MM/yyyy") : "—"}
                </span>
                <Slider
                  value={[selectedImageIdx]}
                  onValueChange={([v]) => setSelectedImageIdx(v)}
                  max={satImages.length - 1}
                  step={1}
                  className="flex-1"
                />
                <span className="text-xs text-muted-foreground">Opacidade: {opacity}%</span>
                <Slider
                  value={[opacity]}
                  onValueChange={([v]) => setOpacity(v)}
                  max={100}
                  step={5}
                  className="w-24"
                />
              </div>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[400px] rounded-b-lg overflow-hidden">
              <MapContainer
                bounds={bounds}
                className="h-full w-full"
                scrollWheelZoom={true}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <LeafletPolygon
                  positions={leafletCoords}
                  pathOptions={{ color: "#1E88E5", weight: 2, fillOpacity: 0.05 }}
                />
                {tileUrl && bounds && (
                  <ImageOverlay
                    url={tileUrl}
                    bounds={bounds}
                    opacity={opacity / 100}
                  />
                )}
              </MapContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* NDVI Evolution Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Evolução NDVI</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis domain={[0, 1]} tick={{ fontSize: 10 }} />
                <RTooltip
                  contentStyle={{ fontSize: 12 }}
                  formatter={(val: any, name: string) => [Number(val).toFixed(3), name]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="max" stroke="none" fill="#C8E6C9" name="Máximo" />
                <Area type="monotone" dataKey="min" stroke="none" fill="#FFCDD2" name="Mínimo" />
                <Line type="monotone" dataKey="mean" stroke="#2E7D32" strokeWidth={2} dot={{ r: 3 }} name="NDVI Médio" />
                {/* Phenology stage markers */}
                {phenologyMarkers.map((m, i) => (
                  <ReferenceLine
                    key={i}
                    x={m.date}
                    stroke={m.color}
                    strokeWidth={2}
                    strokeDasharray="4 2"
                    label={{ value: m.stage, position: "top", style: { fontSize: 9, fill: m.color, fontWeight: 600 } }}
                  />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 mt-2">
              {phenologyMarkers.map((m, i) => (
                <Badge key={i} variant="outline" className="text-[10px]" style={{ borderColor: m.color, color: m.color }}>
                  {m.stage}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Image history table */}
      {satImages.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Histórico de Imagens</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Data</TableHead>
                    <TableHead className="text-xs">Satélite</TableHead>
                    <TableHead className="text-xs">Cobertura nuvens</TableHead>
                    <TableHead className="text-xs">NDVI</TableHead>
                    <TableHead className="text-xs">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {satImages.slice(0, 50).map((img, i) => {
                    const statsEntry = ndviTimeline.find(s => s.dt === img.dt);
                    return (
                      <TableRow key={i} className={selectedImageIdx === i ? "bg-primary/5" : ""}>
                        <TableCell className="text-sm">{format(fromUnixTime(img.dt), "dd/MM/yyyy")}</TableCell>
                        <TableCell className="text-sm">
                          <Badge variant="outline" className="text-[10px]">
                            {img.type === 0 ? "Landsat" : img.type === 1 ? "Sentinel-2" : `Tipo ${img.type}`}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{(img.cl * 100).toFixed(0)}%</TableCell>
                        <TableCell className="text-sm font-mono">
                          {statsEntry?.mean != null ? (
                            <span style={{ color: getNdviColor(statsEntry.mean) }}>
                              {Number(statsEntry.mean).toFixed(3)}
                            </span>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setSelectedImageIdx(i)}>
                            <Eye className="h-3 w-3 mr-1" /> Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {imagesLoading && (
        <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Buscando imagens de satélite...</span>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──

function NdviCard({ title, value, subtitle, color, trend, icon }: {
  title: string; value: string; subtitle?: string;
  color?: string; trend?: number; icon?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
          {icon || <TrendingUp className="h-3 w-3" />} {title}
        </p>
        <p className="text-2xl font-bold mt-1" style={color ? { color } : undefined}>{value}</p>
        {trend !== undefined && trend !== 0 && (
          <span className={`text-xs ${trend > 0 ? "text-green-600" : "text-red-600"}`}>
            {trend > 0 ? "↑" : "↓"} {Math.abs(trend).toFixed(3)}
          </span>
        )}
        {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

function getNdviColor(value: number | null | undefined): string {
  if (value == null) return "#999";
  if (value >= 0.7) return "#2E7D32";
  if (value >= 0.5) return "#4CAF50";
  if (value >= 0.3) return "#FF9800";
  if (value >= 0.1) return "#F44336";
  return "#B71C1C";
}
