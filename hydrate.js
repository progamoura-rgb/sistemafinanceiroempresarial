// hydrate.js
import { loadDashboard } from './api.js';

const els = {
  kpiIncome: () => document.querySelector('#kpi-income'),
  kpiOutcome: () => document.querySelector('#kpi-outcome'),
  bars: () => document.querySelector('#bars'),
  donut: () => document.querySelector('#donut'),
  donutLegend: () => document.querySelector('#donut-legend'),
  txBody: () => document.querySelector('#tx-body'),
  year: () => document.querySelector('#year-select'),
  month: () => document.querySelector('#month-select')
};

const MONTH_NAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

document.addEventListener('DOMContentLoaded', async () => {
  ensureFilters();
  await refresh();
  els.year().addEventListener('change', refresh);
  els.month().addEventListener('change', refresh);
});

async function refresh() {
  const ano = parseInt(els.year().value, 10);
  const mes = parseInt(els.month().value, 10) || 0;
  const data = await loadDashboard({ ano, mes, limit: 25 });
  hydrateKpis(data.kpis);
  renderBars(data.series);
  renderDonut(data.pie);
  renderTx(data.tx);
}

/* ---------- KPIs ---------- */
function hydrateKpis(k) {
  if (els.kpiIncome()) els.kpiIncome().textContent = k.incomeFmt;
  if (els.kpiOutcome()) els.kpiOutcome().textContent = k.outcomeFmt;
}

/* ---------- Barras (Analytics) ---------- */
function renderBars(series) {
  const root = els.bars();
  if (!root) return;
  root.innerHTML = '';
  const max = Math.max(...series.income, ...series.outcome, 1);
  series.months.forEach((m, i) => {
    const g = document.createElement('div');
    g.className = 'bar-group';
    g.style.display = 'flex';
    g.style.flexDirection = 'column';
    g.style.alignItems = 'center';
    g.style.width = 'clamp(20px, 6vw, 36px)';

    const stack = document.createElement('div');
    stack.style.display = 'flex';
    stack.style.gap = '4px';
    stack.style.alignItems = 'flex-end';
    stack.style.height = '120px';

    const inc = document.createElement('div');
    inc.title = `Receitas ${MONTH_NAMES[i]}: ${fmt(series.income[i])}`;
    inc.style.width = '10px';
    inc.style.height = `${Math.round((series.income[i] / max) * 100)}%`;
    inc.style.background = 'var(--inc, #10b981)';

    const out = document.createElement('div');
    out.title = `Despesas ${MONTH_NAMES[i]}: ${fmt(series.outcome[i])}`;
    out.style.width = '10px';
    out.style.height = `${Math.round((series.outcome[i] / max) * 100)}%`;
    out.style.background = 'var(--out, #ef4444)';

    stack.appendChild(inc);
    stack.appendChild(out);

    const lbl = document.createElement('div');
    lbl.textContent = MONTH_NAMES[i];
    lbl.style.fontSize = '12px';
    lbl.style.marginTop = '6px';

    g.appendChild(stack);
    g.appendChild(lbl);
    root.appendChild(g);
  });
}

/* ---------- Donut ---------- */
function renderDonut(pie) {
  const donut = els.donut();
  const legend = els.donutLegend();
  if (!donut || !legend) return;

  legend.innerHTML = '';
  donut.style.background = '#e5e7eb';
  donut.style.borderRadius = '50%';

  if (!pie || !pie.labels.length || pie.total <= 0) {
    donut.style.background = '#e5e7eb';
    return;
  }

  let acc = 0;
  const stops = pie.values.map((v, i) => {
    const from = (acc / pie.total) * 360;
    acc += v;
    const to = (acc / pie.total) * 360;
    const color = donutColor(i);
    addLegendItem(legend, color, pie.labels[i], fmt(v));
    return `${color} ${from.toFixed(2)}deg ${to.toFixed(2)}deg`;
  });

  donut.style.background = `conic-gradient(${stops.join(', ')})`;
}

function addLegendItem(ul, color, label, value) {
  const li = document.createElement('li');
  li.style.display = 'flex';
  li.style.alignItems = 'center';
  li.style.justifyContent = 'space-between';
  li.style.gap = '8px';
  li.style.fontSize = '12px';
  const dot = document.createElement('span');
  dot.style.display = 'inline-block';
  dot.style.width = '10px';
  dot.style.height = '10px';
  dot.style.borderRadius = '50%';
  dot.style.background = color;
  const text = document.createElement('span');
  text.textContent = label;
  const val = document.createElement('strong');
  val.textContent = value;
  li.appendChild(dot);
  li.appendChild(text);
  li.appendChild(val);
  ul.appendChild(li);
}

function donutColor(i) {
  const palette = ['#6366f1','#22c55e','#f59e0b','#ef4444','#06b6d4','#a855f7','#84cc16','#f97316','#14b8a6','#64748b'];
  return palette[i % palette.length];
}

/* ---------- Transações (com classes e avatar dinâmico) ---------- */
function renderTx(rows) {
  const tb = els.txBody();
  if (!tb) return;
  tb.innerHTML = '';

  rows.forEach(r => {
    const tr = document.createElement('tr');
    tr.className = 'transaction-row';

    // ===== Coluna: Name
    const tdName = document.createElement('td');
    tdName.className = 'transaction-name-cell';

    const wrap = document.createElement('div');
    wrap.className = 'transaction-name';

    const avatar = document.createElement('div');
    avatar.className = 'transaction-avatar';
    avatar.textContent = initials(r.name);
    avatar.style.background = pickColor(r.category || r.name);

    const info = document.createElement('div');
    const company = document.createElement('div');
    company.className = 'transaction-company';
    company.textContent = r.name;
    info.appendChild(company);

    wrap.appendChild(avatar);
    wrap.appendChild(info);
    tdName.appendChild(wrap);

    // ===== Coluna: Date
    const tdDate = document.createElement('td');
    tdDate.className = 'transaction-date';
    tdDate.textContent = r.date;
    tdDate.style.textAlign = 'center';

    // ===== Coluna: Amount
    const tdAmount = document.createElement('td');
    tdAmount.className = 'transaction-amount';
    tdAmount.textContent = r.amountFmt;
    tdAmount.style.textAlign = 'right';

    // ===== Coluna: Status
    const tdStatus = document.createElement('td');
    const st = document.createElement('span');
    const succeeded = r.status === 'Succeeded';
    st.className = 'status-badge ' + (succeeded ? 'status-succeeded' : 'status-pending');
    st.textContent = succeeded ? 'Succeeded' : 'Pending';
    tdStatus.appendChild(st);

    tr.appendChild(tdName);
    tr.appendChild(tdDate);
    tr.appendChild(tdAmount);
    tr.appendChild(tdStatus);

    tb.appendChild(tr);
  });
}

// ===== Helpers locais =====
function initials(name) {
  const s = String(name || '').trim();
  if (!s) return '—';
  const parts = s.split(/\s+/).slice(0, 2);
  return parts.map(p => p[0]).join('').toUpperCase();
}

function pickColor(key) {
  const palette = ['#3b82f6', '#fbbf24', '#ef4444', '#10b981', '#8b5cf6', '#06b6d4'];
  let h = 0; const str = String(key || '');
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}


/* ---------- Filtros (ano/mês) ---------- */
function ensureFilters() {
  const yEl = els.year();
  const mEl = els.month();
  if (!yEl || !mEl) return;

  const now = new Date();
  const yNow = now.getFullYear();
  const years = [yNow - 1, yNow, yNow + 1];

  yEl.innerHTML = years.map(y => `<option value="${y}" ${y === yNow ? 'selected':''}>${y}</option>`).join('');

  const months = ['Todos', ...MONTH_NAMES];
  mEl.innerHTML = months.map((name, i) => {
    const val = i === 0 ? 0 : i;
    const sel = (i === (now.getMonth() + 1)) ? 'selected' : '';
    return `<option value="${val}" ${sel}>${name}</option>`;
  }).join('');
  mEl.value = String(now.getMonth() + 1);
}

/* ---------- Utils ---------- */
function fmt(n) {
  return (n || 0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
}
