import defaultLogo from "@/assets/report-logo-default.png";

export default function ReportCover({ data }: { data: any }) {
  const logoSrc = data.logo_url || defaultLogo;

  return (
    <div className="report-cover">
      <img src={logoSrc} alt="Logo" style={{ height: 60, marginBottom: 30, objectFit: "contain" }} />
      <div className="cover-label">RELATÓRIO DE PRODUÇÃO</div>
      <div className="cover-hybrid">{data.hibrido}</div>
      <div className="cover-season">Safra {data.safra}</div>
      <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.3)", margin: "20px 0" }} />
      <div className="cover-grid">
        <span><strong>Contrato:</strong> {data.contrato}</span>
        <span><strong>Cliente:</strong> {data.cliente}</span>
        <span><strong>Cooperado:</strong> {data.cooperado}</span>
        <span><strong>Fazenda:</strong> {data.fazenda}</span>
        <span><strong>Pivô:</strong> {data.pivo}</span>
        <span><strong>Área Total:</strong> {data.area_total} ha</span>
        <span><strong>Fêmea:</strong> {data.area_femea} ha</span>
        <span><strong>Macho:</strong> {data.area_macho} ha</span>
      </div>
      <div className="cover-footer">
        Gerado em {new Date().toLocaleDateString("pt-BR")} às{" "}
        {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        {data.organizacao && ` — ${data.organizacao}`}
      </div>
    </div>
  );
}
