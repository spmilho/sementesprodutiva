import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SamplePoint } from "./types";
import { getPointColor } from "./utils";
import "leaflet/dist/leaflet.css";

interface Props {
  points: SamplePoint[];
  avgNetYield: number;
  pivotLat?: number;
  pivotLng?: number;
  pivotName: string;
  pivotArea?: number;
}

export default function YieldEstimateMap({ points, avgNetYield, pivotLat, pivotLng, pivotName, pivotArea }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    const initMap = async () => {
      const L = await import("leaflet");

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const centerLat = pivotLat || (points.length > 0 ? points[0].latitude : -15.79);
      const centerLng = pivotLng || (points.length > 0 ? points[0].longitude : -47.88);

      const map = L.map(mapRef.current!, { scrollWheelZoom: true }).setView([centerLat, centerLng], 15);
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
      }).addTo(map);

      // Pivot center marker
      if (pivotLat && pivotLng) {
        const pivotIcon = L.divIcon({
          className: "",
          html: `<div style="background:#1e3a5f;color:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:16px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);">📍</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });
        L.marker([pivotLat, pivotLng], { icon: pivotIcon })
          .addTo(map)
          .bindPopup(`<b>${pivotName}</b>${pivotArea ? `<br/>${pivotArea} ha` : ""}`);
      }

      // Sample point markers
      const latlngs: [number, number][] = [];
      points.forEach((p) => {
        const net = p.point_gross_yield_kg_ha || 0;
        const color = getPointColor(net, avgNetYield);
        latlngs.push([Number(p.latitude), Number(p.longitude)]);

        const icon = L.divIcon({
          className: "",
          html: `<div style="background:${color};color:white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:12px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);">${p.point_number}</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        L.marker([Number(p.latitude), Number(p.longitude)], { icon })
          .addTo(map)
          .bindPopup(
            `<b>Ponto ${p.point_number}</b> — ${p.sample_date || ""}<br/>` +
            `Espigas/ha: ${Math.round(p.ears_per_ha || 0).toLocaleString()}<br/>` +
            `Grãos/espiga: ${(p.avg_kernels_per_ear || 0).toFixed(0)}<br/>` +
            `Prod. bruta: ${Math.round(p.point_gross_yield_kg_ha || 0).toLocaleString()} kg/ha<br/>` +
            `Coord: ${Number(p.latitude).toFixed(5)}, ${Number(p.longitude).toFixed(5)}`
          );
      });

      // Connect points with dashed line
      if (latlngs.length > 1) {
        L.polyline(latlngs, { color: "#9ca3af", dashArray: "8 4", weight: 2 }).addTo(map);
      }

      // Fit bounds
      if (latlngs.length > 0) {
        const allLatLngs = [...latlngs];
        if (pivotLat && pivotLng) allLatLngs.push([pivotLat, pivotLng]);
        map.fitBounds(L.latLngBounds(allLatLngs).pad(0.1));
      }

      // Legend
      const legend = new L.Control({ position: "bottomright" });
      legend.onAdd = () => {
        const div = L.DomUtil.create("div", "");
        div.style.cssText = "background:white;padding:8px 10px;border-radius:6px;font-size:11px;box-shadow:0 1px 4px rgba(0,0,0,.2);line-height:1.6";
        div.innerHTML = `
          <span style="color:#22c55e">🟢</span> Acima da média<br/>
          <span style="color:#eab308">🟡</span> Na média<br/>
          <span style="color:#ef4444">🔴</span> Abaixo da média<br/>
          📍 Centro pivô
        `;
        return div;
      };
      legend.addTo(map);

      setTimeout(() => map.invalidateSize(), 200);
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [points, avgNetYield, pivotLat, pivotLng, pivotName, pivotArea]);

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Mapa do Pivô com Pontos de Amostragem</CardTitle></CardHeader>
      <CardContent className="p-0">
        <div ref={mapRef} style={{ height: 500, width: "100%" }} className="rounded-b-lg" />
      </CardContent>
    </Card>
  );
}
