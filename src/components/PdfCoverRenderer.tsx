import { useEffect, useRef, useState } from "react";
import coverBg from "@/assets/report-cover-bg.jpg";
import logoWhite from "@/assets/report-logo-white.png";

interface CycleData {
  client: string;
  farm: string;
  field: string;
  hybrid: string;
  season: string;
  area: number;
}

interface PdfCoverRendererProps {
  cycle: CycleData | null;
  onReady: (element: HTMLDivElement) => void;
}

const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default function PdfCoverRenderer({ cycle, onReady }: PdfCoverRendererProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [imagesLoaded, setImagesLoaded] = useState(false);

  useEffect(() => {
    // Preload images
    let loaded = 0;
    const total = 2;
    const check = () => {
      loaded++;
      if (loaded >= total) setImagesLoaded(true);
    };
    const img1 = new Image();
    img1.onload = check;
    img1.onerror = check;
    img1.src = coverBg;
    const img2 = new Image();
    img2.onload = check;
    img2.onerror = check;
    img2.src = logoWhite;
  }, []);

  useEffect(() => {
    if (imagesLoaded && cycle && ref.current) {
      // Small delay to ensure render
      setTimeout(() => {
        if (ref.current) onReady(ref.current);
      }, 100);
    }
  }, [imagesLoaded, cycle, onReady]);

  if (!cycle) return null;

  const now = new Date();
  const dateStr = `${MONTHS_PT[now.getMonth()]} ${now.getFullYear()}`;

  return (
    <div
      style={{
        position: "fixed",
        left: "-9999px",
        top: 0,
        zIndex: -1,
        pointerEvents: "none",
      }}
    >
      <div
        ref={ref}
        id="pdf-cover"
        style={{
          width: "794px",
          height: "1123px",
          position: "relative",
          overflow: "hidden",
          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
          backgroundColor: "#0d1f0d",
        }}
      >
        {/* Background image */}
        <img
          src={coverBg}
          alt=""
          crossOrigin="anonymous"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            position: "absolute",
            top: 0,
            left: 0,
          }}
        />

        {/* Gradient overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.75) 100%)",
          }}
        />

        {/* Content layer */}
        <div
          style={{
            position: "relative",
            zIndex: 10,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "40px",
            boxSizing: "border-box",
          }}
        >
          {/* Logo top-left */}
          <div>
            <img
              src={logoWhite}
              alt="Sementes Produtiva"
              crossOrigin="anonymous"
              style={{ maxWidth: "180px", height: "auto", mixBlendMode: "screen" }}
            />
            <div
              style={{
                width: "100%",
                height: "1px",
                backgroundColor: "rgba(255,255,255,0.3)",
                marginTop: "16px",
              }}
            />
          </div>

          {/* Title block — bottom area */}
          <div style={{ marginBottom: "60px" }}>
            {/* Decorative line */}
            <div
              style={{
                width: "40px",
                height: "2px",
                backgroundColor: "#4CAF50",
                marginBottom: "12px",
              }}
            />

            {/* Document type */}
            <p
              style={{
                fontSize: "12px",
                textTransform: "uppercase",
                letterSpacing: "3px",
                color: "rgba(255,255,255,0.8)",
                margin: 0,
              }}
            >
              RELATÓRIO DE PRODUÇÃO
            </p>

            {/* Hybrid name */}
            <h1
              style={{
                fontSize: "36px",
                fontWeight: 700,
                color: "#ffffff",
                margin: "8px 0 0 0",
                lineHeight: 1.2,
              }}
            >
              {cycle.hybrid}
            </h1>

            {/* Season */}
            <p
              style={{
                fontSize: "20px",
                fontWeight: 300,
                color: "rgba(255,255,255,0.9)",
                margin: "4px 0 0 0",
              }}
            >
              Safra {cycle.season}
            </p>

            {/* Separator */}
            <div
              style={{
                width: "60px",
                height: "2px",
                backgroundColor: "#4CAF50",
                margin: "16px 0",
              }}
            />

            {/* Field data */}
            {[
              `Cliente: ${cycle.client}`,
              `Fazenda: ${cycle.farm}`,
              `Pivô: ${cycle.field}`,
              `Área: ${cycle.area} ha`,
            ].map((line, i) => (
              <p
                key={i}
                style={{
                  fontSize: "13px",
                  color: "rgba(255,255,255,0.85)",
                  margin: "4px 0",
                  lineHeight: 1.5,
                }}
              >
                {line}
              </p>
            ))}
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: "10px",
                color: "rgba(255,255,255,0.6)",
              }}
            >
              Sementes Produtiva — Excelência em Produção de Sementes
            </span>
            <span
              style={{
                fontSize: "10px",
                color: "rgba(255,255,255,0.6)",
              }}
            >
              {dateStr}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
