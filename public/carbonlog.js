// Role: all browser logic. It only talks to the REST API with fetch and renders results.
// There is NO emission calculation here: co2_kg always comes from the server.
'use strict';

const $ = (sel) => document.querySelector(sel);

const state = { factors: [], charts: {} };

// ---------- helpers ----------
// Builds DOM nodes with textContent only, so user-entered notes can never inject HTML.
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const c of children) node.append(c);
  return node;
}

const nf = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 });
const labelOf = (category) => category.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.fields = data.fields || {};
    throw err;
  }
  return data;
}

function showGlobalError(message) {
  const box = $('#global-error');
  box.textContent = message || '';
  box.hidden = !message;
}

// ---------- navigation ----------
function showView(name) {
  for (const v of document.querySelectorAll('.view')) v.hidden = v.id !== `view-${name}`;
  for (const t of document.querySelectorAll('.tab')) {
    if (t.dataset.view === name) t.setAttribute('aria-current', 'page');
    else t.removeAttribute('aria-current');
  }
  showGlobalError('');
  if (name === 'dashboard') loadDashboard();
  if (name === 'entries') loadEntries();
  if (name === 'settings') { renderFactors(); loadTargetForm(); }
}

// ---------- dashboard ----------
function currentRange() {
  const from = $('#range-from').value;
  const to = $('#range-to').value;
  const q = new URLSearchParams();
  if (from) q.set('from', from);
  if (to) q.set('to', to);
  return q.toString() ? `?${q}` : '';
}

async function loadDashboard() {
  const stateBox = $('#dash-state');
  const content = $('#dash-content');
  stateBox.textContent = 'Loading…';
  content.hidden = true;
  try {
    const [summary, target] = await Promise.all([
      api(`/api/summary${currentRange()}`),
      api(`/api/targets/${new Date().getFullYear()}`),
    ]);
    if (summary.entry_count === 0) {
      stateBox.textContent = 'No entries in this period yet. Add your first activity on the Entries tab.';
      return;
    }
    stateBox.textContent = '';
    content.hidden = false;
    $('#stat-total').textContent = `${nf.format(summary.total_co2_kg)} kg CO₂`;
    $('#stat-count').textContent = String(summary.entry_count);
    $('#stat-top').textContent = labelOf(summary.by_category[0].category);
    drawCharts(summary);
    drawTarget(target);
  } catch (err) {
    stateBox.textContent = '';
    showGlobalError(`Could not load the dashboard: ${err.message}`);
  }
}

const PALETTE = ['#2a7f3e', '#2b8fbf', '#e9a92c', '#7aa83a', '#d9734e', '#6c8fd1'];  // leaf, sky, sunflower, moss, clay, periwinkle

function drawCharts(summary) {
  if (typeof Chart === 'undefined') {
    showGlobalError('Charts could not be loaded (Chart.js CDN unreachable). Numbers are still shown above.');
    return;
  }
  for (const c of Object.values(state.charts)) c.destroy();
  Chart.defaults.color = '#4b6653';                 // readable on the light theme
  Chart.defaults.borderColor = 'rgba(21,54,31,.1)';
  Chart.defaults.font.family = 'inherit';
  state.charts.category = new Chart($('#chart-category'), {
    type: 'doughnut',
    data: {
      labels: summary.by_category.map((r) => labelOf(r.category)),
      datasets: [{ data: summary.by_category.map((r) => r.co2_kg), backgroundColor: PALETTE, borderColor: '#ffffff', borderWidth: 2 }],
    },
    options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } },
  });
  state.charts.month = new Chart($('#chart-month'), {
    type: 'bar',
    data: {
      labels: summary.by_month.map((r) => r.month),
      datasets: [{ label: 'kg CO₂', data: summary.by_month.map((r) => r.co2_kg), backgroundColor: '#2a7f3e', borderRadius: 6 }],
    },
    options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } },
  });
}

function drawTarget(t) {
  const text = $('#target-text');
  const bar = $('#target-bar');
  bar.style.width = '0';
  if (t.reduction_percent === null) {
    text.textContent = 'No target set for this year. You can set one under Settings.';
    return;
  }
  if (t.baseline_co2_kg <= 0) {
    text.textContent = `Target: reduce by ${t.reduction_percent}% versus ${t.baseline_year}. There are no entries for ${t.baseline_year} yet, so progress cannot be calculated.`;
    return;
  }
  const achieved = t.achieved_reduction_percent;
  text.textContent =
    `Target: reduce by ${t.reduction_percent}% versus ${t.baseline_year} (${nf.format(t.baseline_co2_kg)} kg). ` +
    `So far this year: ${nf.format(t.current_co2_kg)} kg, which is ${achieved >= 0 ? achieved + '% below' : Math.abs(achieved) + '% above'} the baseline.`;
  const used = Math.min(100, Math.max(0, (t.current_co2_kg / t.target_co2_kg) * 100));
  bar.style.width = `${used}%`;
  bar.style.background = t.current_co2_kg > t.target_co2_kg ? '#d9734e' : '#2a7f3e';
}

// ---------- entries ----------
async function loadEntries() {
  const stateBox = $('#entries-state');
  const table = $('#entries-table');
  stateBox.textContent = 'Loading…';
  table.hidden = true;
  try {
    const rows = await api('/api/entries');
    const body = table.querySelector('tbody');
    body.replaceChildren();
    if (rows.length === 0) {
      stateBox.textContent = 'No entries yet. Click "Add entry" to log your first activity.';
      return;
    }
    stateBox.textContent = '';
    table.hidden = false;
    for (const r of rows) {
      body.append(
        el('tr', {},
          el('td', {}, r.entry_date),
          el('td', {}, labelOf(r.category)),
          el('td', { class: 'num' }, `${nf.format(r.amount)} ${r.unit}`),
          el('td', { class: 'num' }, nf.format(r.co2_kg)),
          el('td', {}, r.note || ''),
          el('td', { class: 'actions' },
            el('button', { type: 'button', class: 'btn small', onclick: () => openDialog(r), 'aria-label': `Edit entry from ${r.entry_date}, ${labelOf(r.category)}` }, 'Edit'),
            el('button', { type: 'button', class: 'btn small danger', onclick: () => removeEntry(r), 'aria-label': `Delete entry from ${r.entry_date}, ${labelOf(r.category)}` }, 'Delete'))));
    }
  } catch (err) {
    stateBox.textContent = '';
    showGlobalError(`Could not load entries: ${err.message}`);
  }
}

async function removeEntry(r) {
  if (!confirm(`Delete the ${labelOf(r.category)} entry from ${r.entry_date}? This cannot be undone.`)) return;
  try {
    await api(`/api/entries/${r.id}`, { method: 'DELETE' });
    showGlobalError('');
    loadEntries();
  } catch (err) {
    showGlobalError(`Could not delete: ${err.message}`);
  }
}

// ---------- add / edit dialog ----------
const FIELD_IDS = { category: 'e-category', amount: 'e-amount', unit: 'e-unit', entry_date: 'e-entry_date', note: 'e-note' };

function fillUnits(category, selected) {
  const factor = state.factors.find((f) => f.category === category);
  const select = $('#f-unit');
  select.replaceChildren();
  for (const u of factor ? factor.allowed_units : []) select.append(el('option', { value: u }, u));
  select.value = selected && factor && factor.allowed_units.includes(selected) ? selected : factor ? factor.unit : '';
}

function clearErrors() {
  for (const id of [...Object.values(FIELD_IDS), 'e-form']) $(`#${id}`).textContent = '';
  for (const input of document.querySelectorAll('#entry-form [aria-invalid]')) input.removeAttribute('aria-invalid');
}

function openDialog(entry) {
  clearErrors();
  $('#entry-dialog-title').textContent = entry ? 'Edit entry' : 'Add entry';
  $('#entry-id').value = entry ? entry.id : '';
  const cat = $('#f-category');
  cat.replaceChildren(...state.factors.map((f) => el('option', { value: f.category }, labelOf(f.category))));
  cat.value = entry ? entry.category : state.factors[0].category;
  fillUnits(cat.value, entry ? entry.unit : null);
  $('#f-amount').value = entry ? entry.amount : '';
  $('#f-date').value = entry ? entry.entry_date : todayStr();
  $('#f-date').max = todayStr();
  $('#f-note').value = entry && entry.note ? entry.note : '';
  $('#entry-dialog').showModal();
  $('#f-category').focus();
}

async function submitEntry(event) {
  event.preventDefault();
  clearErrors();
  const id = $('#entry-id').value;
  const body = {
    category: $('#f-category').value,
    amount: $('#f-amount').value,
    unit: $('#f-unit').value,
    entry_date: $('#f-date').value,
    note: $('#f-note').value,
  };
  try {
    await api(id ? `/api/entries/${id}` : '/api/entries', { method: id ? 'PUT' : 'POST', body });
    $('#entry-dialog').close();
    loadEntries();
  } catch (err) {
    const known = Object.keys(err.fields || {}).filter((k) => FIELD_IDS[k]);
    for (const k of known) {
      $(`#${FIELD_IDS[k]}`).textContent = err.fields[k];
      const input = $({ category: '#f-category', amount: '#f-amount', unit: '#f-unit', entry_date: '#f-date', note: '#f-note' }[k]);
      input.setAttribute('aria-invalid', 'true');
    }
    if (!known.length) $('#e-form').textContent = err.message;
  }
}

// ---------- settings ----------
function renderFactors() {
  const body = $('#factors-table tbody');
  body.replaceChildren();
  for (const f of state.factors) {
    const kg = el('input', { type: 'number', step: 'any', min: '0', value: f.kg_co2_per_unit, 'aria-label': `kg CO2 per ${f.unit} for ${labelOf(f.category)}` });
    const src = el('input', { type: 'text', maxlength: '300', value: f.source, 'aria-label': `Source for ${labelOf(f.category)}` });
    const yr = el('input', { type: 'number', min: '1990', value: f.year, 'aria-label': `Year for ${labelOf(f.category)}` });
    const save = el('button', {
      type: 'button',
      class: 'btn small primary',
      onclick: async () => {
        const msg = $('#factors-msg');
        try {
          const updated = await api(`/api/factors/${f.id}`, { method: 'PUT', body: { kg_co2_per_unit: kg.value, source: src.value, year: yr.value } });
          Object.assign(f, updated);
          msg.className = 'msg';
          msg.textContent = `${labelOf(f.category)} saved. Existing entries keep their original CO₂ values.`;
        } catch (err) {
          msg.className = 'msg error';
          msg.textContent = `Could not save ${labelOf(f.category)}: ${err.message}`;
        }
      },
    }, 'Save');
    body.append(el('tr', {}, el('td', {}, labelOf(f.category)), el('td', {}, f.unit), el('td', {}, kg), el('td', {}, src), el('td', {}, yr), el('td', {}, save)));
  }
}

async function loadTargetForm() {
  const year = new Date().getFullYear();
  $('#target-year').value = year;
  try {
    const t = await api(`/api/targets/${year}`);
    $('#target-percent').value = t.reduction_percent === null ? '' : t.reduction_percent;
  } catch (err) {
    showGlobalError(`Could not load target: ${err.message}`);
  }
}

async function saveTarget(event) {
  event.preventDefault();
  const msg = $('#target-msg');
  const year = $('#target-year').value;
  try {
    await api(`/api/targets/${year}`, { method: 'PUT', body: { reduction_percent: $('#target-percent').value } });
    msg.className = 'msg';
    msg.textContent = `Target for ${year} saved.`;
  } catch (err) {
    msg.className = 'msg error';
    msg.textContent = err.message;
  }
}

// ---------- start ----------
async function init() {
  for (const tab of document.querySelectorAll('.tab')) tab.addEventListener('click', () => showView(tab.dataset.view));
  $('#range-form').addEventListener('submit', (e) => { e.preventDefault(); loadDashboard(); });
  $('#range-clear').addEventListener('click', () => { $('#range-from').value = ''; $('#range-to').value = ''; loadDashboard(); });
  $('#add-entry').addEventListener('click', () => openDialog(null));
  $('#entry-cancel').addEventListener('click', () => $('#entry-dialog').close());
  $('#entry-form').addEventListener('submit', submitEntry);
  $('#f-category').addEventListener('change', (e) => fillUnits(e.target.value, null));
  $('#target-form').addEventListener('submit', saveTarget);

  try {
    state.factors = await api('/api/factors');
  } catch (err) {
    showGlobalError(`Could not reach the CarbonLog server (${err.message}). Start it with "npm start" and open http://localhost:3000.`);
  }
  showView('dashboard');
}

// Inside the website, Escape closes the overlay (but not while the entry dialog is open).
if (window.parent !== window) {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !document.querySelector('dialog[open]')) window.parent.postMessage('carbonlog:close', '*');
  });
}

document.addEventListener('DOMContentLoaded', init);
