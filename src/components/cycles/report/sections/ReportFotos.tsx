interface PhotoItem {
  url: string;
  caption: string;
  category: string;
  date?: string;
}

function fmtDate(iso: string | undefined | null): string {
  if (!iso) return "";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return iso;
}

export default function ReportFotos({ data }: { data: any }) {
  const fotos: PhotoItem[] = data._fotos || [];

  if (fotos.length === 0) return null;

  return (
    <div className="report-section">
      <div className="section-title">📷 Registro Fotográfico</div>
      <p style={{ fontSize: 12, color: "#666", marginBottom: 20 }}>
        Total de {fotos.length} foto(s) registradas durante o ciclo.
      </p>
      <div className="photo-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {fotos.map((f, i) => (
          <div key={i} style={{ breakInside: "avoid", marginBottom: 12 }}>
            <img
              src={f.url}
              alt={f.caption || f.category}
              style={{ width: "100%", borderRadius: 8, objectFit: "cover", maxHeight: 280 }}
              loading="lazy"
            />
            <div style={{ fontSize: 10, color: "#888", marginTop: 4 }}>
              <strong>{f.category}</strong>
              {f.date && <> — {fmtDate(f.date)}</>}
            </div>
            {f.caption && (
              <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>{f.caption}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
