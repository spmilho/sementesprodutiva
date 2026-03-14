export default function ReportConclusao({ data }: { data: any }) {
  const paragraphs: string[] = [];

  paragraphs.push(
    `O presente relatório refere-se ao híbrido ${data.hibrido}, safra ${data.safra}, ` +
    `produzido no pivô ${data.pivo}, cooperado ${data.cooperado}, fazenda ${data.fazenda}, ` +
    `contrato ${data.contrato}, com ${data.area_femea ?? "—"} ha de fêmea e ${data.area_macho ?? "—"} ha de macho ` +
    `(${data.area_total ?? "—"} ha total). Split: ${data.split}. ` +
    `Espaçamentos: F×F ${data.espacamento_ff ?? "—"}cm, F×M ${data.espacamento_fm ?? "—"}cm, M×M ${data.espacamento_mm ?? "—"}cm.`
  );

  if (data.lotes_semente?.length > 0) {
    const lotesF = data.lotes_semente.filter((l: any) => l.parental === "Fêmea");
    const lotesM = data.lotes_semente.filter((l: any) => l.parental !== "Fêmea");
    const avgGermF = lotesF.filter((l: any) => l.germinacao).reduce((s: number, l: any) => s + l.germinacao, 0) / (lotesF.filter((l: any) => l.germinacao).length || 1);
    paragraphs.push(
      `A semente básica de fêmea foi recebida em ${lotesF.length} lote(s) com germinação média de ${avgGermF.toFixed(0)}%. ` +
      `Macho em ${lotesM.length} lote(s). ` +
      (data.tratamentos?.length > 0
        ? `O tratamento de sementes foi realizado com ${data.tratamentos.reduce((s: number, t: any) => s + (t.produtos?.length || 0), 0)} produto(s).`
        : "Sem tratamento de sementes registrado.")
    );
  }

  if (data.plantio?.length > 0) {
    const f = data.plantio.filter((p: any) => p.tipo === "Fêmea");
    const m = data.plantio.filter((p: any) => p.tipo !== "Fêmea");
    const totalF = f.reduce((s: number, p: any) => s + (p.area || 0), 0);
    const totalM = m.reduce((s: number, p: any) => s + (p.area || 0), 0);
    paragraphs.push(
      `O plantio de fêmea totalizou ${totalF.toFixed(1)} ha e o de macho ${totalM.toFixed(1)} ha.`
    );
  }

  if (data.stand?.length > 0) {
    const avgPop = data.stand.filter((s: any) => s.pop_plha).reduce((sum: number, s: any) => sum + s.pop_plha, 0) /
      (data.stand.filter((s: any) => s.pop_plha).length || 1);
    paragraphs.push(
      `Foram realizadas ${data.stand.length} contagens de stand, com população média de ${Math.round(avgPop).toLocaleString("pt-BR")} plantas/ha.`
    );
  }

  if (data.insumos?.length > 0) {
    paragraphs.push(`Foram registrados ${data.insumos.length} insumos ao longo do ciclo.`);
  }

  if (data.pragas?.length > 0) {
    const principal = [...data.pragas].sort((a: any, b: any) => (b.incidencia || 0) - (a.incidencia || 0))[0];
    paragraphs.push(
      `Foram registradas ${data.pragas.length} ocorrências de pragas/doenças. ` +
      `Principal: ${principal.nome} com severidade ${principal.severidade || "N/A"} e incidência de ${principal.incidencia ?? "N/A"}%.`
    );
  }

  if (data.despendoamento?.length > 0) {
    const lastDesp = data.despendoamento[data.despendoamento.length - 1];
    paragraphs.push(
      `O despendoamento foi realizado em ${data.despendoamento.length} passada(s). ` +
      (lastDesp.pct_remanescente != null ? `O percentual remanescente na última passada foi de ${lastDesp.pct_remanescente}%.` : "")
    );
  }

  if (data.colheita?.length > 0) {
    const totalTons = data.colheita.reduce((s: number, c: any) => s + (c.tons || 0), 0);
    paragraphs.push(`A colheita totalizou ${totalTons.toFixed(1)} toneladas.`);
  }

  if (data.estimativa) {
    paragraphs.push(
      `A estimativa de produtividade líquida é de ${data.estimativa.prod_liquida_kgha ? (data.estimativa.prod_liquida_kgha / 1000).toFixed(2) : "—"} t/ha, ` +
      `com produção total estimada de ${data.estimativa.prod_total_ton?.toFixed(1) ?? "—"} toneladas.`
    );
  }

  if (data.ndvi_parecer) {
    paragraphs.push(data.ndvi_parecer);
  }

  return (
    <div className="conclusion-section">
      <div className="section-title">✅ Conclusão Técnica</div>
      {paragraphs.map((p, i) => <p key={i}>{p}</p>)}

      <div className="signature-block">
        <div className="sig-line">
          <strong>{data.organizacao}</strong>
        </div>
        <div>Responsável Técnico</div>
        <div className="sig-date">
          {new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}
        </div>
      </div>
    </div>
  );
}
