import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, List, X, ExternalLink, MapPin } from "lucide-react";
import { format } from "date-fns";

// ── Status config ──
const STATUS_CONFIG: Record<string, { color: string; label: string; emoji: string }> = {
  planning:    { color: "#3b82f6", label: "Planejado",       emoji: "🔵" },
  planting:    { color: "#22c55e", label: "Em plantio",      emoji: "🟢" },
  growing:     { color: "#22c55e", label: "Crescimento",     emoji: "🟢" },
  detasseling: { color: "#eab308", label: "Florescimento",   emoji: "🟡" },
  harvest:     { color: "#f97316", label: "Colheita",        emoji: "🟠" },
  completed:   { color: "#9ca3af", label: "Concluído",       emoji: "✅" },
  cancelled:   { color: "#6b7280", label: "Cancelado",       emoji: "⚪" },
};

function getStatusColor(status: string) {
  return STATUS_CONFIG[status]?.color ?? "#6b7280";
}

function getMarkerRadius(areaHa: number | null) {
  if (!areaHa || areaHa <= 0) return 12;
  if (areaHa <= 20) return 12;
  if (areaHa <= 50) return 16;
  if (areaHa <= 100) return 20;
  if (areaHa <= 200) return 24;
  return 28;
}

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

// ── FitBounds component ──
function FitBoundsToMarkers({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length === 0) return;
    if (positions.length === 1) {
      map.setView(positions[0], 14);
    } else {
      const bounds = L.latLngBounds(positions.map(p => L.latLng(p[0], p[1])));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [positions, map]);
  return null;
}

// ── Cluster icon ──
function createClusterIcon(cluster: any) {
  const children = cluster.getAllChildMarkers();
  const count = children.length;
  let worstColor = "#22c55e";
  const priority: Record<string, number> = { cancelled: 0, completed: 1, planning: 2, planting: 3, growing: 4, detasseling: 5, harvest: 6 };
  let worstPriority = -1;
  children.forEach((m: any) => {
    const s = m.options?.data?.status;
    const p = priority[s] ?? 0;
    if (p > worstPriority) { worstPriority = p; worstColor = getStatusColor(s); }
  });
  return L.divIcon({
    html: `<div style="background:${worstColor};color:white;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.4);">${count}</div>`,
    className: "",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

export default function MapaIntegrado() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filterSeason, setFilterSeason] = useState("all");
  const [filterClient, setFilterClient] = useState("all");
  const [filterCooperator, setFilterCooperator] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [tileMode, setTileMode] = useState<TileMode>("satellite");
  const [showPanel, setShowPanel] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: cycles = [], isLoading } = useQuery({
    queryKey: ["map-cycles"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("production_cycles")
        .select("*, clients(name), farms(name), cooperators(name), pivots(name, latitude, longitude, area_ha)")
        .is("deleted_at", null)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const seasons = useMemo(() => {
    const s = new Set<string>();
    cycles.forEach((c: any) => s.add(c.season));
    return Array.from(s).sort().reverse();
  }, [cycles]);

  const clients = useMemo(() => {
    const m = new Map<string, string>();
    cycles.forEach((c: any) => { if (c.clients?.name) m.set(c.client_id, c.clients.name); });
    return Array.from(m, ([id, name]) => ({ id, name }));
  }, [cycles]);

  const cooperators = useMemo(() => {
    const m = new Map<string, string>();
    cycles.forEach((c: any) => { if (c.cooperators?.name) m.set(c.cooperator_id, c.cooperators.name); });
    return Array.from(m, ([id, name]) => ({ id, name }));
  }, [cycles]);

  const filtered = useMemo(() => {
    return cycles.filter((c: any) => {
      if (filterSeason !== "all" && c.season !== filterSeason) return false;
      if (filterClient !== "all" && c.client_id !== filterClient) return false;
      if (filterCooperator !== "all" && c.cooperator_id !== filterCooperator) return false;
      if (filterStatus !== "all" && c.status !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        const match =
          c.hybrid_name?.toLowerCase().includes(q) ||
          c.field_name?.toLowerCase().includes(q) ||
          c.contract_number?.toLowerCase().includes(q) ||
          c.clients?.name?.toLowerCase().includes(q) ||
          c.cooperators?.name?.toLowerCase().includes(q) ||
          c.farms?.name?.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [cycles, filterSeason, filterClient, filterCooperator, filterStatus, search]);

  const withCoords = useMemo(() =>
    filtered.filter((c: any) => c.pivots?.latitude != null && c.pivots?.longitude != null),
  [filtered]);

  const positions = useMemo<[number, number][]>(() =>
    withCoords.map((c: any) => [c.pivots.latitude, c.pivots.longitude]),
  [withCoords]);

  const totalArea = useMemo(() =>
    withCoords.reduce((sum: number, c: any) => sum + (c.total_area || 0), 0),
  [withCoords]);

  const clearFilters = () => {
    setSearch(""); setFilterSeason("all"); setFilterClient("all");
    setFilterCooperator("all"); setFilterStatus("all");
  };

  const hasFilters = search || filterSeason !== "all" || filterClient !== "all" ||
    filterCooperator !== "all" || filterStatus !== "all";

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">🗺️ Mapa de Campos</h1>
        <p className="text-sm text-muted-foreground">Visualização georreferenciada de todos os campos de produção</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 flex-wrap items-end">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar campo..." className="pl-9 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterSeason} onValueChange={setFilterSeason}>
          <SelectTrigger className="w-[130px] h-9 text-sm"><SelectValue placeholder="Safra" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Safras</SelectItem>
            {seasons.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterClient} onValueChange={setFilterClient}>
          <SelectTrigger className="w-[130px] h-9 text-sm"><SelectValue placeholder="Cliente" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterCooperator} onValueChange={setFilterCooperator}>
          <SelectTrigger className="w-[130px] h-9 text-sm"><SelectValue placeholder="Cooperado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {cooperators.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[130px] h-9 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.emoji} {v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {hasFilters && <Button variant="ghost" size="sm" className="h-9" onClick={clearFilters}>Limpar</Button>}
      </div>

      {/* Map + Panel */}
      <div className="flex gap-0 relative">
        {/* Side panel */}
        {showPanel && (
          <Card className="w-[300px] shrink-0 overflow-hidden rounded-r-none border-r-0 z-10">
            <CardContent className="p-0">
              <div className="p-3 border-b border-border flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">{withCoords.length} campos | {totalArea.toFixed(0)} ha</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowPanel(false)}><X className="h-3.5 w-3.5" /></Button>
              </div>
              <div className="overflow-y-auto max-h-[calc(100vh-360px)]">
                {withCoords.map((c: any) => (
                  <button
                    key={c.id}
                    className={`w-full text-left px-3 py-2.5 border-b border-border hover:bg-muted/50 transition-colors ${selectedId === c.id ? "bg-muted" : ""}`}
                    onClick={() => setSelectedId(c.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: getStatusColor(c.status) }} />
                      <span className="text-sm font-medium truncate">{c.contract_number || c.field_name}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                      {c.hybrid_name} • {c.total_area} ha • {c.clients?.name || "—"}
                    </div>
                  </button>
                ))}
                {withCoords.length === 0 && (
                  <div className="p-4 text-center text-sm text-muted-foreground">Nenhum campo com coordenadas</div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Map */}
        <Card className={`flex-1 overflow-hidden ${showPanel ? "rounded-l-none" : ""}`}>
          <CardContent className="p-0 relative">
            {isLoading ? (
              <div className="h-[calc(100vh-280px)] min-h-[400px] flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="h-[calc(100vh-280px)] min-h-[400px]">
                <MapContainer center={[-15.8, -47.9]} zoom={5} className="h-full w-full z-0" minZoom={4} maxZoom={18}>
                  {/* Tiles */}
                  {(tileMode === "satellite" || tileMode === "satellite_labels") && (
                    <TileLayer url={TILES.satellite.url} attribution={TILES.satellite.attribution} />
                  )}
                  {tileMode === "osm" && (
                    <TileLayer url={TILES.osm.url} attribution={TILES.osm.attribution} />
                  )}
                  {tileMode === "satellite_labels" && (
                    <TileLayer url={TILES.labels.url} attribution={TILES.labels.attribution} />
                  )}

                  <FitBoundsToMarkers positions={positions} />

                  <MarkerClusterGroup
                    chunkedLoading
                    iconCreateFunction={createClusterIcon}
                    maxClusterRadius={60}
                  >
                    {withCoords.map((c: any) => {
                      const radius = getMarkerRadius(c.pivots?.area_ha || c.total_area);
                      const color = getStatusColor(c.status);
                      const isPlanned = c.status === "planning";
                      return (
                        <CircleMarker
                          key={c.id}
                          center={[c.pivots.latitude, c.pivots.longitude]}
                          radius={radius}
                          pathOptions={{
                            color: "white",
                            weight: isPlanned ? 2 : 3,
                            fillColor: color,
                            fillOpacity: 0.85,
                            dashArray: isPlanned ? "6 4" : undefined,
                          }}
                          eventHandlers={{ click: () => setSelectedId(c.id) }}
                        >
                          <Tooltip
                            permanent
                            direction="center"
                            className="leaflet-label-pivot"
                          >
                            <span style={{
                              color: "white",
                              fontWeight: 700,
                              fontSize: "10px",
                              textShadow: "0 1px 3px rgba(0,0,0,.8)",
                            }}>
                              {c.pivots?.name || c.field_name}
                            </span>
                          </Tooltip>

                          <Popup maxWidth={340} minWidth={280}>
                            <div className="text-sm space-y-2 p-1">
                              <div className="flex items-center gap-2">
                                <span className="text-base">🌽</span>
                                <span className="font-bold">{c.contract_number || c.field_name} — {c.hybrid_name}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span>Status:</span>
                                <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                                <span className="font-medium">{STATUS_CONFIG[c.status]?.label || c.status}</span>
                              </div>
                              <hr className="border-border" />
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                <div><span className="text-muted-foreground">Cliente:</span> {c.clients?.name || "—"}</div>
                                <div><span className="text-muted-foreground">Cooperado:</span> {c.cooperators?.name || "—"}</div>
                                <div><span className="text-muted-foreground">Fazenda:</span> {c.farms?.name || "—"}</div>
                                <div><span className="text-muted-foreground">Pivô:</span> {c.pivots?.name || c.field_name}</div>
                                <div className="col-span-2"><span className="text-muted-foreground">Área:</span> {c.total_area} ha (F: {c.female_area} ha | M: {c.male_area} ha)</div>
                                <div><span className="text-muted-foreground">Safra:</span> {c.season}</div>
                                {c.contract_number && <div><span className="text-muted-foreground">Contrato:</span> {c.contract_number}</div>}
                              </div>
                              <hr className="border-border" />
                              <div className="text-[11px] text-muted-foreground">
                                Última atualização: {format(new Date(c.updated_at), "dd/MM/yyyy")}
                              </div>
                              <Button
                                size="sm"
                                className="w-full gap-1.5 mt-1"
                                onClick={() => navigate(`/ciclos/${c.id}`)}
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                Abrir Ciclo de Produção
                              </Button>
                            </div>
                          </Popup>
                        </CircleMarker>
                      );
                    })}
                  </MarkerClusterGroup>
                </MapContainer>

                {/* Map controls overlay */}
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

                {/* Panel toggle */}
                {!showPanel && (
                  <button
                    onClick={() => setShowPanel(true)}
                    className="absolute top-3 left-3 z-[1000] px-2.5 py-1.5 text-xs font-medium rounded shadow-md bg-background/90 text-foreground hover:bg-background flex items-center gap-1.5"
                  >
                    <List className="h-3.5 w-3.5" /> Lista
                  </button>
                )}

                {/* Legend */}
                <div className="absolute bottom-3 left-3 z-[1000] bg-background/85 backdrop-blur-sm rounded-lg p-2.5 shadow-md">
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px]">
                    {Object.entries(STATUS_CONFIG).filter(([k]) => k !== "cancelled").map(([key, cfg]) => (
                      <span key={key} className="inline-flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: cfg.color }} />
                        {cfg.label}
                      </span>
                    ))}
                  </div>
                </div>

                {/* No coords message */}
                {!isLoading && withCoords.length === 0 && filtered.length > 0 && (
                  <div className="absolute inset-0 z-[999] flex items-center justify-center pointer-events-none">
                    <Card className="pointer-events-auto">
                      <CardContent className="p-6 text-center">
                        <MapPin className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm font-medium">Nenhum campo com coordenadas</p>
                        <p className="text-xs text-muted-foreground mt-1">Cadastre latitude/longitude nos pivôs para visualizar no mapa.</p>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
