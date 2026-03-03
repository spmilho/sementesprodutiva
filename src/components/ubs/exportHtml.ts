import type { UbsState } from "./types";
import { getWeekLabels, getWeeklyDemand, getClientVolumes, getPhaseConfig, getPhaseWeeklyCap, PHASES } from "./types";

function median(arr: number[]): number {
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 !== 0 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function stddev(arr: number[], mean: number): number {
  if (arr.length < 2) return 0;
  return Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / (arr.length - 1));
}

function fmt(n: number): string {
  return n.toLocaleString("pt-BR");
}

export function exportUbsHtml(state: UbsState, weeklyReceiving: number, weeklyDrying: number) {
  const weekLabels = getWeekLabels(state.startDate, state.numWeeks);
  const weeklyDemand = getWeeklyDemand(state.clients, state.numWeeks);
  const totalDemand = weeklyDemand.reduce((a, b) => a + b, 0);
  const peakIdx = weeklyDemand.indexOf(Math.max(...weeklyDemand));
  const peakDemand = weeklyDemand[peakIdx];
  const deficitWeeks = weeklyDemand.filter((d) => d > weeklyReceiving).length;
  const active = weeklyDemand.filter((d) => d > 0);
  const avgUtil = active.length > 0 ? active.reduce((s, d) => s + (d / weeklyReceiving) * 100, 0) / active.length : 0;
  const maxDeficit = Math.max(...weeklyDemand.map((d) => d - weeklyReceiving));
  const maxDeficitWeek = weeklyDemand.findIndex((d) => d - weeklyReceiving === maxDeficit);
  const totalStaff = PHASES.reduce((sum, p) => sum + ((state.staff[p] || []).reduce((a, b) => a + b, 0)), 0);
  const totalSurplus = weeklyDemand.reduce((s, d) => s + Math.max(weeklyReceiving - d, 0), 0);
  const totalDeficitVal = weeklyDemand.reduce((s, d) => s + Math.max(d - weeklyReceiving, 0), 0);

  // Stats
  const mean = active.length > 0 ? active.reduce((a, b) => a + b, 0) / active.length : 0;
  const med = active.length > 0 ? median(active) : 0;
  const sd = active.length > 0 ? stddev(active, mean) : 0;

  // Chart data
  const chartLabels = JSON.stringify(weekLabels);
  const clientDatasets = state.clients.map((c) => {
    const vols = getClientVolumes(c, state.numWeeks);
    return `{ label: ${JSON.stringify(c.name)}, data: ${JSON.stringify(vols)}, backgroundColor: "${c.color}", borderColor: "${c.color}", borderWidth: 1 }`;
  });

  const balanceData = weeklyDemand.map((d) => weeklyReceiving - d);
  const balanceColors = balanceData.map((b) => b >= 0 ? "#5CDB6E" : "#FF6B6B");
  const utilData = weeklyDemand.map((d) => weeklyReceiving > 0 ? +(d / weeklyReceiving * 100).toFixed(1) : 0);

  // Pie data
  const pieClients = state.clients.map((c) => ({
    name: c.name,
    value: getClientVolumes(c, state.numWeeks).reduce((a, b) => a + b, 0),
    color: c.color,
  })).filter((d) => d.value > 0);

  // Critical weeks
  const criticalWeeks = weeklyDemand
    .map((d, i) => ({ week: weekLabels[i], demand: d, deficit: d - weeklyReceiving, pct: weeklyReceiving > 0 ? +(d / weeklyReceiving * 100).toFixed(1) : 0 }))
    .filter((w) => w.deficit > 0);

  // Phase capacity table
  const phaseCapRows = PHASES.map((p) => {
    const cfg = getPhaseConfig(state, p);
    const cap = state.phaseCapPerShift?.[p] ?? 0;
    const weekly = getPhaseWeeklyCap(state, p);
    return `<tr>
      <td>${p}</td>
      <td class="mono right">${cap}</td>
      <td class="mono right">${cfg.shifts}</td>
      <td class="mono right">${cfg.hoursPerShift}h</td>
      <td class="mono right">${cfg.operatingDays}d</td>
      <td class="mono right accent">${fmt(weekly)}</td>
    </tr>`;
  }).join("");

  // Staff table
  const maxShifts = Math.max(...PHASES.map((p) => getPhaseConfig(state, p).shifts));
  const staffRows = PHASES.map((p) => {
    const cfg = getPhaseConfig(state, p);
    const arr = state.staff[p] || [];
    const total = arr.slice(0, cfg.shifts).reduce((a, b) => a + (b || 0), 0);
    const cells = Array.from({ length: maxShifts }, (_, i) =>
      `<td class="mono right">${i < cfg.shifts ? (arr[i] || 0) : "—"}</td>`
    ).join("");
    return `<tr><td>${p} <span class="dim">(${cfg.shifts}T)</span></td>${cells}<td class="mono right accent">${total}</td></tr>`;
  }).join("");

  // Demand per client table
  const demandRows = state.clients.map((c) => {
    const vols = getClientVolumes(c, state.numWeeks);
    const cells = vols.map((v) => `<td class="mono right">${v > 0 ? fmt(v) : "—"}</td>`).join("");
    const total = vols.reduce((a, b) => a + b, 0);
    return `<tr><td><span class="dot" style="background:${c.color}"></span>${c.name}</td>${cells}<td class="mono right accent">${fmt(total)}</td></tr>`;
  }).join("");
  const totalRow = weeklyDemand.map((d) => `<td class="mono right">${fmt(d)}</td>`).join("");

  const now = new Date();
  const exportDate = now.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const exportTime = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${state.ubsName} — Planejamento de Capacidade</title>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700&family=DM+Mono:wght@400;500&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.7/chart.umd.min.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0f1f14;color:#e8f5e9;font-family:'Inter',sans-serif;font-size:13px;line-height:1.5}
.container{max-width:1200px;margin:0 auto;padding:24px}
h1{font-family:'Syne',sans-serif;font-size:20px;color:#e8f5e9}
h2{font-family:'Syne',sans-serif;font-size:14px;color:#c8e6c9;margin-bottom:12px}
.header{display:flex;align-items:center;justify-content:space-between;padding:16px 24px;border-bottom:1px solid #1e3a25;flex-wrap:wrap;gap:12px}
.header-left{display:flex;align-items:center;gap:12px}
.icon-box{width:40px;height:40px;border-radius:8px;background:rgba(92,219,110,.15);display:flex;align-items:center;justify-content:center}
.icon-box svg{width:20px;height:20px;color:#5CDB6E}
.sub{font-family:'DM Mono',monospace;font-size:11px;color:#8aac8f}
.badges{display:flex;gap:8px;flex-wrap:wrap}
.badge{background:#162b1c;border:1px solid #2a4a32;border-radius:6px;padding:4px 12px;font-family:'DM Mono',monospace;font-size:11px}
.badge-green{color:#5CDB6E}
.badge-cyan{color:#4ECDC4}
.card{background:#162b1c;border:1px solid #2a4a32;border-radius:8px;padding:16px;margin-bottom:16px}
.kpi-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin-bottom:16px}
.kpi{background:#0f1f14;border:1px solid #2a4a32;border-radius:8px;padding:12px;text-align:center}
.kpi-value{font-family:'DM Mono',monospace;font-size:18px;font-weight:700}
.kpi-label{font-size:10px;color:#8aac8f;text-transform:uppercase;letter-spacing:.5px;margin-top:2px}
.kpi-sub{font-size:10px;color:#8aac8f;margin-top:2px}
.chart-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
@media(max-width:768px){.chart-grid{grid-template-columns:1fr}}
.chart-box{position:relative;height:300px}
table{width:100%;border-collapse:collapse;font-size:12px}
th{text-align:left;padding:8px 6px;border-bottom:1px solid #2a4a32;font-family:'DM Mono',monospace;font-size:10px;color:#8aac8f;text-transform:uppercase}
td{padding:6px;border-bottom:1px solid #1e3a25;color:#c8e6c9}
.mono{font-family:'DM Mono',monospace}
.right{text-align:right}
.accent{color:#5CDB6E;font-weight:600}
.dim{color:#8aac8f;font-size:10px}
.dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px}
.red{color:#FF6B6B}
.green{color:#5CDB6E}
.yellow{color:#FFD93D}
.cyan{color:#4ECDC4}
footer{text-align:center;padding:24px;border-top:1px solid #1e3a25;margin-top:24px;color:#8aac8f;font-size:11px;font-family:'DM Mono',monospace}
.section-title{font-family:'Syne',sans-serif;font-size:15px;color:#c8e6c9;margin:24px 0 12px;padding-bottom:6px;border-bottom:1px solid #1e3a25}
</style>
</head>
<body>
<div class="header">
  <div class="header-left">
    <div class="icon-box">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/></svg>
    </div>
    <div>
      <h1>${state.ubsName}</h1>
      <p class="sub">Planejamento de Capacidade — Safra 2026</p>
    </div>
  </div>
  <div class="badges">
    <span class="badge badge-green">Receb. ${fmt(weeklyReceiving)} t/sem</span>
    <span class="badge badge-cyan">Secagem ${fmt(weeklyDrying)} t/sem</span>
  </div>
</div>

<div class="container">

<!-- KPIs Dashboard -->
<div class="section-title">Dashboard de Análise</div>
<div class="kpi-grid">
  <div class="kpi"><div class="kpi-value" style="color:#e8f5e9">${fmt(totalDemand)} t</div><div class="kpi-label">Demanda Total</div></div>
  <div class="kpi"><div class="kpi-value" style="color:#FFD93D">${fmt(peakDemand)} t</div><div class="kpi-label">Pico Demanda</div><div class="kpi-sub">${weekLabels[peakIdx]}</div></div>
  <div class="kpi"><div class="kpi-value" style="color:${deficitWeeks > 0 ? '#FF6B6B' : '#5CDB6E'}">${deficitWeeks}</div><div class="kpi-label">Sem. Déficit</div></div>
  <div class="kpi"><div class="kpi-value" style="color:${avgUtil > 100 ? '#FF6B6B' : avgUtil > 80 ? '#FFD93D' : '#5CDB6E'}">${avgUtil.toFixed(1)}%</div><div class="kpi-label">Utiliz. Média</div></div>
  <div class="kpi"><div class="kpi-value" style="color:${maxDeficit > 0 ? '#FF6B6B' : '#5CDB6E'}">${maxDeficit > 0 ? fmt(maxDeficit) + ' t' : 'Nenhum'}</div><div class="kpi-label">Maior Déficit</div>${maxDeficit > 0 ? `<div class="kpi-sub">${weekLabels[maxDeficitWeek]}</div>` : ''}</div>
  <div class="kpi"><div class="kpi-value cyan">${totalStaff} pessoas</div><div class="kpi-label">Pessoal Total</div></div>
</div>

<!-- Charts -->
<div class="card">
  <h2>Demanda × Capacidade Semanal</h2>
  <div class="chart-box"><canvas id="chartDemand"></canvas></div>
</div>

<div class="chart-grid">
  <div class="card">
    <h2>Balanço Surplus / Déficit</h2>
    <div class="chart-box"><canvas id="chartBalance"></canvas></div>
  </div>
  <div class="card">
    <h2>% Utilização da Capacidade</h2>
    <div class="chart-box"><canvas id="chartUtil"></canvas></div>
  </div>
  <div class="card">
    <h2>Composição da Demanda por Cliente</h2>
    <div class="chart-box"><canvas id="chartPie"></canvas></div>
  </div>
  <div class="card">
    <h2>Distribuição da Demanda (Histograma)</h2>
    <div class="chart-box"><canvas id="chartHist"></canvas></div>
  </div>
</div>

<!-- Capacity Config -->
<div class="section-title">Configuração de Capacidade por Fase</div>
<div class="card">
  <table>
    <thead><tr><th>Fase</th><th class="right">t/turno</th><th class="right">Turnos</th><th class="right">Horas</th><th class="right">Dias/sem</th><th class="right">Semanal (t)</th></tr></thead>
    <tbody>${phaseCapRows}</tbody>
  </table>
</div>

<!-- Staff -->
<div class="section-title">Quadro de Pessoal</div>
<div class="card">
  <table>
    <thead><tr><th>Fase</th>${Array.from({ length: maxShifts }, (_, i) => `<th class="right">T${i + 1}</th>`).join("")}<th class="right">Total</th></tr></thead>
    <tbody>${staffRows}
    <tr style="border-top:1px solid rgba(92,219,110,.3)"><td class="accent" style="font-weight:600">Total geral</td>${Array.from({ length: maxShifts }, () => '<td></td>').join("")}<td class="mono right accent" style="font-weight:700">${totalStaff}</td></tr>
    </tbody>
  </table>
</div>

<!-- Demand Table -->
<div class="section-title">Demanda por Cliente / Semana</div>
<div class="card" style="overflow-x:auto">
  <table>
    <thead><tr><th>Cliente</th>${weekLabels.map((l) => `<th class="right">${l}</th>`).join("")}<th class="right">Total</th></tr></thead>
    <tbody>${demandRows}
    <tr style="border-top:1px solid rgba(92,219,110,.3)"><td class="accent" style="font-weight:600">Total</td>${totalRow}<td class="mono right accent" style="font-weight:700">${fmt(totalDemand)}</td></tr>
    </tbody>
  </table>
</div>

${criticalWeeks.length > 0 ? `
<!-- Critical Weeks -->
<div class="section-title">Semanas Críticas (Déficit)</div>
<div class="card">
  <table>
    <thead><tr><th>Semana</th><th class="right">Demanda (t)</th><th class="right">Déficit (t)</th><th class="right">Sobrecarga</th></tr></thead>
    <tbody>${criticalWeeks.map((w) => `<tr><td>${w.week}</td><td class="mono right">${fmt(w.demand)}</td><td class="mono right red">${fmt(w.deficit)}</td><td class="mono right red">${w.pct}%</td></tr>`).join("")}</tbody>
  </table>
</div>` : ''}

<!-- Stats KPIs -->
<div class="section-title">Análise Estatística</div>
<div class="kpi-grid">
  <div class="kpi"><div class="kpi-value" style="color:#e8f5e9">${fmt(+mean.toFixed(0))} t</div><div class="kpi-label">Média</div></div>
  <div class="kpi"><div class="kpi-value" style="color:#e8f5e9">${fmt(+med.toFixed(0))} t</div><div class="kpi-label">Mediana</div></div>
  <div class="kpi"><div class="kpi-value yellow">${fmt(+sd.toFixed(0))} t</div><div class="kpi-label">Desvio Padrão</div></div>
  <div class="kpi"><div class="kpi-value green">${fmt(totalSurplus)} t</div><div class="kpi-label">Surplus Total</div></div>
  <div class="kpi"><div class="kpi-value" style="color:${totalDeficitVal > 0 ? '#FF6B6B' : '#5CDB6E'}">${fmt(totalDeficitVal)} t</div><div class="kpi-label">Déficit Total</div></div>
  <div class="kpi"><div class="kpi-value" style="color:${totalSurplus >= totalDeficitVal ? '#5CDB6E' : '#FF6B6B'}">${fmt(totalSurplus - totalDeficitVal)} t</div><div class="kpi-label">Folga Líquida</div></div>
</div>

</div>

<footer>
  Exportado em ${exportDate} às ${exportTime} — UBS Sementes de Milho — Planejamento de Capacidade
</footer>

<script>
const labels = ${chartLabels};
const weeklyReceiving = ${weeklyReceiving};
const weeklyDrying = ${weeklyDrying};

Chart.defaults.color = '#8aac8f';
Chart.defaults.borderColor = '#1e3a25';
Chart.defaults.font.size = 11;

// 1. Demand vs Capacity (stacked bar)
new Chart(document.getElementById('chartDemand'), {
  type: 'bar',
  data: {
    labels,
    datasets: [${clientDatasets.join(",")}]
  },
  options: {
    responsive: true, maintainAspectRatio: false,
    scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } },
    plugins: {
      legend: { labels: { font: { size: 10 } } },
      annotation: undefined
    }
  },
  plugins: [{
    id: 'refLines',
    afterDraw(chart) {
      const ctx = chart.ctx;
      const yScale = chart.scales.y;
      const xScale = chart.scales.x;
      // Receiving line
      const yR = yScale.getPixelForValue(weeklyReceiving);
      ctx.save();
      ctx.strokeStyle = '#5CDB6E'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(xScale.left, yR); ctx.lineTo(xScale.right, yR); ctx.stroke();
      ctx.fillStyle = '#5CDB6E'; ctx.font = '10px DM Mono'; ctx.fillText('Receb. ' + weeklyReceiving, xScale.right - 80, yR - 4);
      // Drying line
      const yD = yScale.getPixelForValue(weeklyDrying);
      ctx.strokeStyle = '#4ECDC4'; ctx.lineWidth = 1.5; ctx.setLineDash([6,3]);
      ctx.beginPath(); ctx.moveTo(xScale.left, yD); ctx.lineTo(xScale.right, yD); ctx.stroke();
      ctx.fillStyle = '#4ECDC4'; ctx.fillText('Secag. ' + weeklyDrying, xScale.right - 80, yD - 4);
      ctx.restore();
    }
  }]
});

// 2. Balance
new Chart(document.getElementById('chartBalance'), {
  type: 'bar',
  data: {
    labels,
    datasets: [{
      label: 'Balanço (t)',
      data: ${JSON.stringify(balanceData)},
      backgroundColor: ${JSON.stringify(balanceColors)},
      borderWidth: 0
    }]
  },
  options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
});

// 3. Utilization
new Chart(document.getElementById('chartUtil'), {
  type: 'line',
  data: {
    labels,
    datasets: [{
      label: 'Utilização (%)',
      data: ${JSON.stringify(utilData)},
      borderColor: '#5CDB6E',
      backgroundColor: 'rgba(92,219,110,0.1)',
      fill: true,
      tension: 0.3,
      pointRadius: 4,
      pointBackgroundColor: ${JSON.stringify(utilData.map((v) => v > 100 ? '#FF6B6B' : v >= 80 ? '#FFD93D' : '#5CDB6E'))}
    }]
  },
  options: {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true } }
  },
  plugins: [{
    id: 'thresholds',
    afterDraw(chart) {
      const ctx = chart.ctx;
      const yScale = chart.scales.y;
      const xScale = chart.scales.x;
      ctx.save();
      [{ v: 80, c: '#FFD93D' }, { v: 100, c: '#FF6B6B' }].forEach(({ v, c }) => {
        const y = yScale.getPixelForValue(v);
        if (y >= yScale.top && y <= yScale.bottom) {
          ctx.strokeStyle = c; ctx.lineWidth = 1; ctx.setLineDash([6,3]);
          ctx.beginPath(); ctx.moveTo(xScale.left, y); ctx.lineTo(xScale.right, y); ctx.stroke();
          ctx.fillStyle = c; ctx.font = '9px DM Mono'; ctx.fillText(v + '%', xScale.right - 30, y - 3);
        }
      });
      ctx.restore();
    }
  }]
});

// 4. Pie
new Chart(document.getElementById('chartPie'), {
  type: 'doughnut',
  data: {
    labels: ${JSON.stringify(pieClients.map((d) => d.name))},
    datasets: [{
      data: ${JSON.stringify(pieClients.map((d) => d.value))},
      backgroundColor: ${JSON.stringify(pieClients.map((d) => d.color))},
      borderWidth: 0
    }]
  },
  options: {
    responsive: true, maintainAspectRatio: false,
    cutout: '55%',
    plugins: {
      legend: { position: 'bottom', labels: { font: { size: 10 } } },
      tooltip: { callbacks: { label: function(ctx) { return ctx.label + ': ' + ctx.parsed.toLocaleString('pt-BR') + ' t'; } } }
    }
  }
});

// 5. Histogram
const histData = ${JSON.stringify((() => {
    if (active.length === 0) return [];
    const binSize = 200;
    const maxVal = Math.max(...active);
    const bins: { range: string; count: number }[] = [];
    for (let lo = 0; lo <= maxVal; lo += binSize) {
      bins.push({ range: `${lo}–${lo + binSize}`, count: active.filter((d) => d >= lo && d < lo + binSize).length });
    }
    return bins;
  })())};
new Chart(document.getElementById('chartHist'), {
  type: 'bar',
  data: {
    labels: histData.map(d => d.range),
    datasets: [{
      label: 'Semanas',
      data: histData.map(d => d.count),
      backgroundColor: '#5CDB6E',
      borderRadius: 4
    }]
  },
  options: {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
  }
});
</script>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  a.href = url;
  a.download = `UBS_Planejamento_${dateStr}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
