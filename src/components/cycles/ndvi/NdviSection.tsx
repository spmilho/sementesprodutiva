import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, fromUnixTime, getUnixTime, subDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Loader2, Satellite, RefreshCw, MapPin, TrendingUp, Eye, Trash2, Calendar as CalendarIcon, ClipboardCopy, FileText, ChevronDown } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Tooltip as RTooltip, ReferenceLine, Legend, Area, Bar, Cell,
} from "recharts";
import { MapContainer, TileLayer, Polygon as LeafletPolygon } from "react-leaflet";
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
  hybridName?: string;
  phenologyRecords: any[];
}

interface SatImage {
  dt: number;
  type: number;
  dc: number;
  cl: number;
  sun: { azimuth: number; elevation: number };
  image: { truecolor: string; falsecolor: string; ndvi: string; evi: string };
  tile: { ndvi: string; truecolor: string; falsecolor: string };
  stats: { ndvi: string };
  data: { ndvi: string; truecolor: string; falsecolor: string };
}

interface NdviStats {
  std: number; p25: number; num: number; min: number; max: number;
  median: number; p75: number; mean: number;
}

type DateFilterMode = "planting" | "custom" | "all";

export default function NdviSection({
  cycleId, orgId, pivotId, pivotName, hybridName, phenologyRecords,
}: NdviSectionProps) {
  const queryClient = useQueryClient();
  const [opacity, setOpacity] = useState(70);
  const [layerType, setLayerType] = useState<"ndvi" | "truecolor" | "falsecolor">("ndvi");
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>("all");
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Latest phenology stage
  const latestStage = useMemo(() => {
    if (!phenologyRecords.length) return null;
    const sorted = [...phenologyRecords].sort((a, b) => b.observation_date.localeCompare(a.observation_date));
    return sorted[0]?.stage || null;
  }, [phenologyRecords]);

  // Fetch planting dates for this cycle
  const { data: plantingDates } = useQuery({
    queryKey: ["planting-dates-ndvi", cycleId],
    queryFn: async () => {
      // Try planting_actual first
      const { data: actuals } = await (supabase as any)
        .from("planting_actual")
        .select("planting_date")
        .eq("cycle_id", cycleId)
        .is("deleted_at", null)
        .order("planting_date", { ascending: true })
        .limit(1);
      if (actuals && actuals.length > 0 && actuals[0].planting_date) {
        return { date: actuals[0].planting_date, source: "actual" as const };
      }
      // Fallback to planting_plan
      const { data: plans } = await (supabase as any)
        .from("planting_plan")
        .select("planned_date")
        .eq("cycle_id", cycleId)
        .is("deleted_at", null)
        .order("planned_date", { ascending: true })
        .limit(1);
      if (plans && plans.length > 0 && plans[0].planned_date) {
        return { date: plans[0].planned_date, source: "plan" as const };
      }
      return null;
    },
  });

  const plantingDateObj = plantingDates?.date ? parseISO(plantingDates.date) : null;
  const plantingTimestamp = plantingDateObj ? getUnixTime(plantingDateObj) : null;

  // Set default date filter mode based on planting data
  useEffect(() => {
    if (plantingDates) {
      setDateFilterMode("planting");
    } else {
      setDateFilterMode("all");
    }
  }, [plantingDates]);

  // Compute the effective start date for filtering
  const filterStartDate = useMemo((): Date | null => {
    if (dateFilterMode === "planting" && plantingDateObj) return plantingDateObj;
    if (dateFilterMode === "custom" && customDate) return customDate;
    return null; // "all" → no filter
  }, [dateFilterMode, plantingDateObj, customDate]);

  const filterStartTimestamp = filterStartDate ? getUnixTime(filterStartDate) : null;

  // Fetch stored polygon
  const { data: polygon, isLoading: polygonLoading } = useQuery({
    queryKey: ["ndvi-polygon", cycleId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("ndvi_polygons")
        .select("*")
        .eq("cycle_id", cycleId)
        .is("deleted_at", null)
        .maybeSingle();
      return data ?? null;
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
      const areaHa = pivot?.area_ha || 50;
      const radiusM = Math.sqrt((areaHa * 10000) / Math.PI);
      const numPoints = 32;
      const coords: [number, number][] = [];
      for (let i = 0; i <= numPoints; i++) {
        const angle = (2 * Math.PI * i) / numPoints;
        const dLat = (radiusM * Math.cos(angle)) / 111320;
        const dLng = (radiusM * Math.sin(angle)) / (111320 * Math.cos((lat * Math.PI) / 180));
        coords.push([lng + dLng, lat + dLat]);
      }
      const geoJson = {
        type: "Feature",
        properties: { name: pivotName },
        geometry: { type: "Polygon", coordinates: [coords] },
      };
      const agroData = await ndviProxy("create_polygon", {
        name: `${pivotName} - ${cycleId.slice(0, 8)}`,
        geo_json: geoJson,
      });
      const { error } = await supabase.rpc("upsert_ndvi_polygon" as any, {
        _cycle_id: cycleId,
        _org_id: orgId,
        _agro_polygon_id: agroData.id,
        _polygon_name: pivotName,
        _polygon_geo: geoJson,
        _area_ha: agroData.area ? (agroData.area / 10000).toFixed(2) : null,
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

  // Fetch satellite images — use filterStartTimestamp for API start param
  const apiStartTimestamp = useMemo(() => {
    if (filterStartTimestamp) return filterStartTimestamp;
    return getUnixTime(subDays(new Date(), 180));
  }, [filterStartTimestamp]);

  const { data: satImages = [], isLoading: imagesLoading, refetch: refetchImages } = useQuery({
    queryKey: ["ndvi-images", polygon?.agro_polygon_id, dateFilterMode === "all" ? "all" : undefined],
    queryFn: async () => {
      if (!polygon?.agro_polygon_id) return [];
      const end = getUnixTime(new Date());
      // Always fetch from 180 days ago to have all data for filtering
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

  // Filter images by date
  const filteredImages = useMemo(() => {
    if (!filterStartTimestamp) return satImages;
    return satImages.filter(img => img.dt >= filterStartTimestamp);
  }, [satImages, filterStartTimestamp]);

  // Fetch NDVI stats for each image
  const { data: ndviTimeline = [] } = useQuery({
    queryKey: ["ndvi-stats", polygon?.agro_polygon_id, satImages.length],
    queryFn: async () => {
      if (satImages.length === 0) return [];
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

  // Filter timeline by date
  const filteredTimeline = useMemo(() => {
    if (!filterStartTimestamp) return ndviTimeline;
    return ndviTimeline.filter(p => p.dt >= filterStartTimestamp);
  }, [ndviTimeline, filterStartTimestamp]);

  // Fetch previous analyses
  const { data: previousAnalyses = [], refetch: refetchAnalyses } = useQuery({
    queryKey: ["ndvi-analyses", cycleId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("ndvi_analyses")
        .select("*")
        .eq("cycle_id", cycleId)
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  const latestAnalysis = previousAnalyses[0] || null;




  // Delete polygon
  const deletePolygonMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("soft_delete_record", {
        _table_name: "ndvi_polygons",
        _record_id: polygon?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ndvi-polygon", cycleId] });
      toast.success("Polígono NDVI removido. Você pode configurar novamente.");
    },
    onError: (e: any) => toast.error(e.message),
  });

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

  // Selected image from filtered list
  const selectedImage = filteredImages[selectedImageIdx] || filteredImages[0];

  // KPI cards from filtered timeline
  const currentNdvi = filteredTimeline[filteredTimeline.length - 1];
  const previousNdvi = filteredTimeline.length > 1 ? filteredTimeline[filteredTimeline.length - 2] : null;
  const maxNdvi = filteredTimeline.length > 0
    ? filteredTimeline.reduce((max, v) => (v.mean || 0) > (max.mean || 0) ? v : max, filteredTimeline[0])
    : null;

  // Generate analysis mutation
  const generateAnalysisMut = useMutation({
    mutationFn: async () => {
      const currentNdviVal = currentNdvi?.mean != null ? Number(currentNdvi.mean) : null;
      const previousNdviVal = previousNdvi?.mean != null ? Number(previousNdvi.mean) : null;
      const timelineForStats = filteredTimeline.length > 0 ? filteredTimeline : ndviTimeline;
      const cleanImgs = filteredImages.filter(img => img.cl < 0.3);

      const { data, error } = await supabase.functions.invoke("ndvi-analysis", {
        body: {
          ndviData: {
            currentMean: currentNdviVal,
            previousMean: previousNdviVal,
            totalImages: filteredImages.length,
            cleanImages: cleanImgs.length,
            minMean: timelineForStats.length > 0 ? Math.min(...timelineForStats.map(t => Number(t.mean || 999))) : null,
            maxMean: timelineForStats.length > 0 ? Math.max(...timelineForStats.map(t => Number(t.mean || 0))) : null,
          },
          plantingDate: plantingDates?.date || null,
          phenologyStage: latestStage,
          pivotName,
          hybridName: hybridName || null,
          filterStartDate: filterStartDate ? format(filterStartDate, "yyyy-MM-dd") : null,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      // Persist
      await (supabase as any).from("ndvi_analyses").insert({
        cycle_id: cycleId,
        org_id: orgId,
        analysis_text: data.analysis,
        ndvi_value: data.ndviValue,
        growth_stage: data.growthStage || latestStage,
        dap: data.dap,
        filter_start_date: filterStartDate ? format(filterStartDate, "yyyy-MM-dd") : null,
      });

      refetchAnalyses();
      toast.success("Análise atualizada!");
      return data;
    },
    onError: (e: any) => toast.error(e.message || "Erro ao gerar análise"),
  });

  // Chart data
  const showAllWithPlanting = dateFilterMode === "all" && plantingTimestamp !== null;
  
  // Build sorted list of phenology milestones (date → stage) for lookup
  const phenoMilestones = useMemo(() => {
    if (!phenologyRecords.length) return [];
    const map = new Map<string, { date: Date; stage: string }>();
    for (const r of phenologyRecords) {
      const d = new Date(r.observation_date + "T12:00:00");
      const key = r.stage;
      // Keep earliest date per stage
      if (!map.has(key) || d < map.get(key)!.date) {
        map.set(key, { date: d, stage: r.stage });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [phenologyRecords]);

  // For a given date, find the active phenology stage (most recent on or before that date)
  const getStageForDate = useCallback((dt: Date): string | null => {
    if (!phenoMilestones.length) return null;
    let active: string | null = null;
    for (const m of phenoMilestones) {
      if (m.date <= dt) active = m.stage;
      else break;
    }
    return active;
  }, [phenoMilestones]);

  const chartData = useMemo(() => {
    const timeline = dateFilterMode === "all" ? ndviTimeline : filteredTimeline;
    return timeline.map((point) => {
      const isPrePlanting = showAllWithPlanting && plantingTimestamp && point.dt < plantingTimestamp;
      const dateLabel = format(fromUnixTime(point.dt), "dd/MM");
      const pointDate = fromUnixTime(point.dt);
      const stage = getStageForDate(pointDate);
      return {
        date: dateLabel,
        fullDate: format(pointDate, "dd/MM/yyyy"),
        rawDate: pointDate,
        dt: point.dt,
        mean: point.mean ? Number(Number(point.mean).toFixed(3)) : null,
        min: point.min ? Number(Number(point.min).toFixed(3)) : null,
        max: point.max ? Number(Number(point.max).toFixed(3)) : null,
        isPrePlanting,
        stage,
      };
    });
  }, [ndviTimeline, filteredTimeline, dateFilterMode, showAllWithPlanting, plantingTimestamp, getStageForDate]);

  // Planting date formatted for chart reference line
  const plantingChartDate = plantingDateObj ? format(plantingDateObj, "dd/MM") : null;

  // Phenology markers
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

  // Polygon bounds
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

  const tileUrl = useMemo(() => {
    if (!selectedImage) return null;
    const raw = selectedImage.tile?.[layerType];
    if (!raw) return null;
    return raw.replace(/^http:\/\//, "https://");
  }, [selectedImage, layerType]);

  // Reset selected image index when filter changes
  useEffect(() => {
    setSelectedImageIdx(0);
  }, [dateFilterMode, customDate]);

  // ── RENDER ──

  if (polygonLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

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
          value={`${filteredImages.length}`}
          subtitle={filterStartDate ? `Desde ${format(filterStartDate, "dd/MM/yyyy")}` : "Todas disponíveis"}
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
                <Button size="sm" variant="outline" className="h-7 text-destructive hover:text-destructive"
                  onClick={() => { if (confirm("Excluir polígono NDVI? Você poderá recriar depois.")) deletePolygonMut.mutate(); }}
                  disabled={deletePolygonMut.isPending}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
            {filteredImages.length > 0 && (
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  <Select
                    value={String(selectedImageIdx)}
                    onValueChange={(v) => setSelectedImageIdx(Number(v))}
                  >
                    <SelectTrigger className="h-7 w-[150px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredImages.map((img, i) => (
                        <SelectItem key={i} value={String(i)} className="text-xs">
                          {format(fromUnixTime(img.dt), "dd/MM/yyyy")} {img.cl < 0.1 ? "☀️" : img.cl < 0.3 ? "🌤️" : "☁️"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Opacidade: {opacity}%</span>
                  <Slider value={[opacity]} onValueChange={([v]) => setOpacity(v)} max={100} step={5} className="w-24" />
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[400px] rounded-b-lg overflow-hidden">
              <MapContainer bounds={bounds} className="h-full w-full" scrollWheelZoom={true}>
                <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="Esri" />
                <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" attribution="Esri" />
                {tileUrl && (
                  <TileLayer key={tileUrl} url={tileUrl} opacity={opacity / 100} zIndex={500} attribution="Agromonitoring" />
                )}
                <LeafletPolygon positions={leafletCoords} pathOptions={{ color: "#1E88E5", weight: 2, fillOpacity: 0.05 }} />
              </MapContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ DATE FILTER CONTROL ═══ */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-medium">📅 Exibir imagens a partir de:</span>
          </div>
          <RadioGroup
            value={dateFilterMode}
            onValueChange={(v) => setDateFilterMode(v as DateFilterMode)}
            className="flex flex-wrap items-center gap-x-6 gap-y-3"
          >
            {/* Option 1: Planting date */}
            <div className="flex items-center gap-2">
              <RadioGroupItem value="planting" id="date-planting" disabled={!plantingDateObj} />
              <Label htmlFor="date-planting" className={cn("text-sm cursor-pointer", !plantingDateObj && "text-muted-foreground line-through")}>
                Desde o plantio {plantingDateObj ? `(${format(plantingDateObj, "dd/MM/yyyy")})` : "(sem registro)"}
              </Label>
            </div>

            {/* Option 2: Custom date */}
            <div className="flex items-center gap-2">
              <RadioGroupItem value="custom" id="date-custom" />
              <Label htmlFor="date-custom" className="text-sm cursor-pointer">Data personalizada:</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("h-7 text-xs gap-1.5", !customDate && "text-muted-foreground")}>
                    <CalendarIcon className="h-3 w-3" />
                    {customDate ? format(customDate, "dd/MM/yyyy") : "Selecionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customDate}
                    onSelect={(d) => { setCustomDate(d); setDateFilterMode("custom"); }}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Option 3: All images */}
            <div className="flex items-center gap-2">
              <RadioGroupItem value="all" id="date-all" />
              <Label htmlFor="date-all" className="text-sm cursor-pointer">Todas as imagens</Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

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
                  labelFormatter={(label: any, payload: any) => {
                    const p = payload?.[0]?.payload;
                    const dateStr = p?.fullDate || label;
                    return p?.stage ? `${dateStr}  —  ${p.stage}` : dateStr;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="max" stroke="none" fill="#C8E6C9" name="Máximo" />
                <Area type="monotone" dataKey="min" stroke="none" fill="#FFCDD2" name="Mínimo" />
                {/* NDVI Mean line with stage labels on dots */}
                <Line
                  type="monotone"
                  dataKey="mean"
                  stroke="#2E7D32"
                  strokeWidth={2}
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    if (cx == null || cy == null) return <g key="empty" />;
                    const isGray = showAllWithPlanting && payload?.isPrePlanting;
                    const fill = isGray ? "#9E9E9E" : "#2E7D32";
                    const stage = payload?.stage;
                    const stageColor = stage ? (STAGE_COLORS[stage.split("/")[0]] || "#666") : null;
                    return (
                      <g key={`dot-${cx}-${cy}`}>
                        <circle cx={cx} cy={cy} r={stage ? 5 : 3} fill={fill} stroke={fill} />
                        {stage && (
                          <>
                            <rect
                              x={cx - stage.length * 3.2}
                              y={cy - 22}
                              width={stage.length * 6.5 + 4}
                              height={14}
                              rx={3}
                              fill={stageColor || "#666"}
                              opacity={0.9}
                            />
                            <text
                              x={cx}
                              y={cy - 12}
                              textAnchor="middle"
                              fill="white"
                              fontSize={9}
                              fontWeight={700}
                            >
                              {stage}
                            </text>
                          </>
                        )}
                      </g>
                    );
                  }}
                  name="NDVI Médio"
                />
                {/* Planting date marker */}
                {plantingChartDate && (dateFilterMode === "planting" || dateFilterMode === "all") && (
                  <ReferenceLine
                    x={plantingChartDate}
                    stroke="#4CAF50"
                    strokeWidth={2}
                    strokeDasharray="6 3"
                    label={{ value: "🌱 Plantio", position: "top", style: { fontSize: 10, fill: "#4CAF50", fontWeight: 700 } }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 mt-2">
              {plantingChartDate && (
                <Badge variant="outline" className="text-[10px]" style={{ borderColor: "#4CAF50", color: "#4CAF50" }}>
                  🌱 Plantio
                </Badge>
              )}
              {phenologyMarkers.map((m, i) => (
                <Badge key={i} variant="outline" className="text-[10px]" style={{ borderColor: m.color, color: m.color }}>
                  {m.stage}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ ANÁLISE DO CAMPO ═══ */}
      {filteredTimeline.length > 0 && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              📊 Análise do Campo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {latestAnalysis ? (
              <>
                {/* Header badge line */}
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {latestAnalysis.growth_stage && (
                    <Badge style={{ backgroundColor: STAGE_COLORS[latestAnalysis.growth_stage] || "#666", color: "white" }}>
                      {latestAnalysis.growth_stage}
                    </Badge>
                  )}
                  {latestAnalysis.dap != null && <span className="text-muted-foreground">{latestAnalysis.dap} DAP</span>}
                  {latestAnalysis.ndvi_value != null && (
                    <span className="font-mono" style={{ color: getNdviColor(Number(latestAnalysis.ndvi_value)) }}>
                      NDVI: {Number(latestAnalysis.ndvi_value).toFixed(3)}
                    </span>
                  )}
                  <span className="text-muted-foreground">
                    {format(new Date(latestAnalysis.analysis_date), "dd/MM/yyyy")}
                  </span>
                </div>

                {/* Analysis text */}
                <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed">
                  <ReactMarkdown>{latestAnalysis.analysis_text}</ReactMarkdown>
                </div>

                {/* Timestamp */}
                <p className="text-[10px] text-muted-foreground">
                  🕐 Atualizado em {format(new Date(latestAnalysis.created_at), "dd/MM/yyyy HH:mm")}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhuma análise disponível. Clique em "Atualizar análise" para gerar o primeiro parecer.
              </p>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-1 border-t">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1.5"
                onClick={() => generateAnalysisMut.mutate()}
                disabled={generateAnalysisMut.isPending}
              >
                {generateAnalysisMut.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                {generateAnalysisMut.isPending ? "Analisando..." : "🔄 Atualizar análise"}
              </Button>
              {latestAnalysis && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => {
                    navigator.clipboard.writeText(latestAnalysis.analysis_text);
                    toast.success("Análise copiada!");
                  }}
                >
                  <ClipboardCopy className="h-3 w-3" /> 📋 Copiar
                </Button>
              )}
            </div>

            {/* Pareceres Anteriores */}
            {previousAnalyses.length > 1 && (
              <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 w-full justify-start">
                    <ChevronDown className={cn("h-3 w-3 transition-transform", historyOpen && "rotate-180")} />
                    📊 Pareceres Anteriores ({previousAnalyses.length - 1})
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 mt-2">
                  {previousAnalyses.slice(1).map((a: any) => (
                    <div key={a.id} className="border rounded-lg p-3 bg-muted/30">
                      <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                        {a.growth_stage && <Badge variant="outline" className="text-[10px]">{a.growth_stage}</Badge>}
                        {a.dap != null && <span>{a.dap} DAP</span>}
                        {a.ndvi_value != null && <span className="font-mono">NDVI: {Number(a.ndvi_value).toFixed(3)}</span>}
                        <span>{format(new Date(a.created_at), "dd/MM/yyyy HH:mm")}</span>
                      </div>
                      <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed">
                        <ReactMarkdown>{a.analysis_text}</ReactMarkdown>
                      </div>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}
          </CardContent>
        </Card>
      )}

      {/* Image history table */}
      {filteredImages.length > 0 && (
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
                    {dateFilterMode === "all" && plantingTimestamp && (
                      <TableHead className="text-xs">Fase</TableHead>
                    )}
                    <TableHead className="text-xs">Satélite</TableHead>
                    <TableHead className="text-xs">Cobertura nuvens</TableHead>
                    <TableHead className="text-xs">NDVI</TableHead>
                    <TableHead className="text-xs">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredImages.slice(0, 50).map((img, i) => {
                    const statsEntry = ndviTimeline.find(s => s.dt === img.dt);
                    const isPrePlanting = plantingTimestamp ? img.dt < plantingTimestamp : false;
                    return (
                      <TableRow key={i} className={selectedImageIdx === i ? "bg-primary/5" : ""}>
                        <TableCell className="text-sm">{format(fromUnixTime(img.dt), "dd/MM/yyyy")}</TableCell>
                        {dateFilterMode === "all" && plantingTimestamp && (
                          <TableCell>
                            {isPrePlanting ? (
                              <Badge variant="outline" className="text-[10px] border-amber-600 text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400">
                                🟤 Pré-plantio
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] border-green-600 text-green-700 bg-green-50 dark:bg-green-900/20 dark:text-green-400">
                                🟢 Ciclo atual
                              </Badge>
                            )}
                          </TableCell>
                        )}
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
