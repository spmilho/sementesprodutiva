import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PARENT_COLORS, PARENT_LABELS } from "./constants";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

interface Props {
  fixedPoints: any[];
  allReadings: any[];
  observations: any[];
}

function createColorIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

export default function FixedPointsMap({ fixedPoints, allReadings, observations }: Props) {
  const validPoints = fixedPoints.filter(
    (fp: any) => fp.latitude && fp.longitude
  );

  const center = useMemo(() => {
    if (validPoints.length === 0) return [-15.79, -47.88] as [number, number];
    const avgLat =
      validPoints.reduce((s: number, fp: any) => s + fp.latitude, 0) /
      validPoints.length;
    const avgLng =
      validPoints.reduce((s: number, fp: any) => s + fp.longitude, 0) /
      validPoints.length;
    return [avgLat, avgLng] as [number, number];
  }, [validPoints]);

  // Get latest reading for each fixed point
  const latestReadingMap = useMemo(() => {
    const map: Record<string, any> = {};
    // observations sorted desc by date
    for (const fp of fixedPoints) {
      for (const obs of observations) {
        const reading = allReadings.find(
          (r: any) =>
            r.observation_id === obs.id && r.fixed_point_id === fp.id
        );
        if (reading) {
          map[fp.id] = { reading, date: obs.observation_date };
          break;
        }
      }
    }
    return map;
  }, [fixedPoints, observations, allReadings]);

  if (validPoints.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">🗺️ Mapa de Pontos Fixos</CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-hidden rounded-b-lg">
        <MapContainer
          center={center}
          zoom={16}
          style={{ height: 300, width: "100%" }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {validPoints.map((fp: any) => {
            const color = PARENT_COLORS[fp.parent_type] || "#888";
            const icon = createColorIcon(color);
            const latest = latestReadingMap[fp.id];
            const isMale = fp.parent_type.startsWith("male");
            let lastValue = "—";
            let lastDate = "—";

            if (latest) {
              lastDate = latest.date;
              if (isMale) {
                lastValue = `${latest.reading.male_pollen_release_pct ?? 0}% pólen`;
              } else {
                lastValue = `${latest.reading.female_silk_receptive_pct ?? 0}% receptivo`;
              }
            }

            return (
              <Marker
                key={fp.id}
                position={[fp.latitude, fp.longitude]}
                icon={icon}
              >
                <Popup>
                  <div className="text-xs space-y-1">
                    <p className="font-semibold">{fp.name}</p>
                    <p style={{ color }}>
                      {PARENT_LABELS[fp.parent_type] || fp.parent_type}
                    </p>
                    <p>Último: {lastValue}</p>
                    <p className="text-muted-foreground">Data: {lastDate}</p>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </CardContent>
    </Card>
  );
}
