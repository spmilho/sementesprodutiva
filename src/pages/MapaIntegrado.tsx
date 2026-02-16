import { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, LayersControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Droplets, Eye, FlaskConical } from "lucide-react";

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function coloredIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:24px;height:24px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.35);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -14],
  });
}

function getMoistureColor(pct: number): string {
  if (pct > 25) return "hsl(0, 70%, 50%)";
  if (pct > 20) return "hsl(25, 85%, 55%)";
  if (pct > 18) return "hsl(50, 85%, 50%)";
  return "hsl(130, 55%, 40%)";
}

function getMoistureLabel(pct: number): string {
  if (pct > 25) return "Alta (> 25%)";
  if (pct > 20) return "Moderada (20–25%)";
  if (pct > 18) return "Quase pronta (18–20%)";
  return "Pronta (< 18%)";
}

const FARM_CENTER: [number, number] = [-15.82, -47.92];

const moistureSamples = [
  { id: 1, lat: -15.815, lng: -47.915, moisture: 28.4, date: "10/02/2026", method: "Medidor portátil", cycle: "Talhão A1 — P3456H", sampler: "Carlos Silva" },
  { id: 2, lat: -15.822, lng: -47.925, moisture: 21.3, date: "12/02/2026", method: "NIR", cycle: "Talhão B3 — SYN7205", sampler: "Ana Souza" },
  { id: 3, lat: -15.828, lng: -47.910, moisture: 17.5, date: "14/02/2026", method: "Medidor portátil", cycle: "Talhão C2 — ADV9012", sampler: "João Lima" },
  { id: 4, lat: -15.812, lng: -47.930, moisture: 23.8, date: "13/02/2026", method: "Estufa", cycle: "Talhão D1 — GDM4510", sampler: "Maria Santos" },
  { id: 5, lat: -15.835, lng: -47.918, moisture: 19.2, date: "15/02/2026", method: "Medidor portátil", cycle: "Talhão E4 — P4020Y", sampler: "Pedro Alves" },
];

const visitRecords = [
  { id: 1, lat: -15.818, lng: -47.920, date: "14/02/2026", type: "Rotina", visitor: "Carlos Silva", condition: "Bom", observations: "Desenvolvimento uniforme, sem pragas visíveis.", cycle: "Talhão A1 — P3456H" },
  { id: 2, lat: -15.825, lng: -47.912, date: "15/02/2026", type: "Inspeção do cliente", visitor: "Dr. Roberto (Corteva)", condition: "Excelente", observations: "Cliente satisfeito com o stand. Elogiou o despendoamento.", cycle: "Talhão C2 — ADV9012" },
  { id: 3, lat: -15.830, lng: -47.928, date: "16/02/2026", type: "Auditoria de qualidade", visitor: "Ana Souza", condition: "Regular", observations: "Algumas plantas fora de tipo identificadas no setor norte. Roguing recomendado.", cycle: "Talhão D1 — GDM4510" },
];

const applicationRecords = [
  { id: 1, lat: -15.820, lng: -47.917, date: "08/02/2026", product: "Engeo Pleno S", target: "Inseticida", dose: "0,25 L/ha", area: 45, cycle: "Talhão A1 — P3456H", pest: "Spodoptera frugiperda" },
  { id: 2, lat: -15.827, lng: -47.922, date: "10/02/2026", product: "Nativo", target: "Fungicida", dose: "0,75 L/ha", area: 38, cycle: "Talhão B3 — SYN7205", pest: "Cercospora zeae-maydis" },
  { id: 3, lat: -15.833, lng: -47.908, date: "12/02/2026", product: "Roundup Original DI", target: "Herbicida", dose: "2,0 L/ha", area: 52, cycle: "Talhão C2 — ADV9012", pest: "Plantas daninhas" },
];

const visitIcon = coloredIcon("hsl(215, 70%, 55%)");
const applicationIcon = coloredIcon("hsl(280, 60%, 55%)");

const visitTypeBadge: Record<string, string> = {
  Rotina: "bg-blue-100 text-blue-800",
  "Inspeção do cliente": "bg-amber-100 text-amber-800",
  "Auditoria de qualidade": "bg-purple-100 text-purple-800",
  Emergência: "bg-red-100 text-red-800",
};

const targetColors: Record<string, string> = {
  Inseticida: "bg-red-100 text-red-800",
  Fungicida: "bg-violet-100 text-violet-800",
  Herbicida: "bg-emerald-100 text-emerald-800",
};

export default function MapaIntegrado() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mapa Integrado</h1>
        <p className="text-sm text-muted-foreground">Visualização georreferenciada de todas as operações de campo</p>
      </div>

      {/* Legend */}
      <Card>
        <CardContent className="py-3 px-4">
          <div className="flex flex-wrap gap-4 text-xs">
            <span className="font-semibold text-muted-foreground">Legenda Umidade:</span>
            {[
              { color: "hsl(0, 70%, 50%)", label: "> 25%" },
              { color: "hsl(25, 85%, 55%)", label: "20–25%" },
              { color: "hsl(50, 85%, 50%)", label: "18–20%" },
              { color: "hsl(130, 55%, 40%)", label: "< 18%" },
            ].map((item) => (
              <span key={item.label} className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full inline-block" style={{ background: item.color }} />
                {item.label}
              </span>
            ))}
            <span className="border-l border-border pl-4 inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full inline-block" style={{ background: "hsl(215, 70%, 55%)" }} />
              Visitas
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full inline-block" style={{ background: "hsl(280, 60%, 55%)" }} />
              Aplicações
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Map */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="h-[calc(100vh-280px)] min-h-[400px]">
            <MapContainer center={FARM_CENTER} zoom={14} className="h-full w-full z-0">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <LayersControl position="topright">
                {/* Moisture */}
                <LayersControl.Overlay checked name="💧 Umidade">
                  <>
                    {moistureSamples.map((s) => (
                      <Marker key={`m-${s.id}`} position={[s.lat, s.lng]} icon={coloredIcon(getMoistureColor(s.moisture))}>
                        <Popup maxWidth={280}>
                          <div className="text-sm space-y-1">
                            <div className="font-bold flex items-center gap-1"><Droplets className="h-3.5 w-3.5" /> Amostra de Umidade</div>
                            <div><strong>Ciclo:</strong> {s.cycle}</div>
                            <div><strong>Data:</strong> {s.date}</div>
                            <div><strong>Umidade:</strong> <span className="font-semibold">{s.moisture.toFixed(1).replace(".", ",")}%</span></div>
                            <div><strong>Status:</strong> {getMoistureLabel(s.moisture)}</div>
                            <div><strong>Método:</strong> {s.method}</div>
                            <div><strong>Coletado por:</strong> {s.sampler}</div>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </>
                </LayersControl.Overlay>

                {/* Visits */}
                <LayersControl.Overlay checked name="👁️ Visitas">
                  <>
                    {visitRecords.map((v) => (
                      <Marker key={`v-${v.id}`} position={[v.lat, v.lng]} icon={visitIcon}>
                        <Popup maxWidth={300}>
                          <div className="text-sm space-y-1">
                            <div className="font-bold flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> Visita de Campo</div>
                            <div><strong>Ciclo:</strong> {v.cycle}</div>
                            <div><strong>Data:</strong> {v.date}</div>
                            <div><strong>Tipo:</strong> {v.type}</div>
                            <div><strong>Visitante:</strong> {v.visitor}</div>
                            <div><strong>Condição:</strong> {v.condition}</div>
                            <div><strong>Obs:</strong> {v.observations}</div>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </>
                </LayersControl.Overlay>

                {/* Applications */}
                <LayersControl.Overlay checked name="🧪 Aplicações">
                  <>
                    {applicationRecords.map((a) => (
                      <Marker key={`a-${a.id}`} position={[a.lat, a.lng]} icon={applicationIcon}>
                        <Popup maxWidth={280}>
                          <div className="text-sm space-y-1">
                            <div className="font-bold flex items-center gap-1"><FlaskConical className="h-3.5 w-3.5" /> Aplicação Química</div>
                            <div><strong>Ciclo:</strong> {a.cycle}</div>
                            <div><strong>Data:</strong> {a.date}</div>
                            <div><strong>Produto:</strong> {a.product}</div>
                            <div><strong>Tipo:</strong> {a.target}</div>
                            <div><strong>Dose:</strong> {a.dose}</div>
                            <div><strong>Área:</strong> {a.area} ha</div>
                            <div><strong>Alvo:</strong> {a.pest}</div>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </>
                </LayersControl.Overlay>
              </LayersControl>
            </MapContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
