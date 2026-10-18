import { ICONS, KEYWORDS } from './config.js';
import { load, save } from './storage.js';
import { render, renderResults, renderList, updateTotals } from './render.js';
import { exportXlsx } from './export.js';

let st = load(); let editing = null; let color = null; let listMode = false; let searches = [];
st.list = st.list || { ids: [], prices: {} }; st.list.stores = st.list.stores || {};
const $ = id => document.getElementById(id);
const NEW = '__new__';
const slug = n => n.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'setor';

// ---------- Diálogo para criar setor / unidade / cor ----------
function ask(kind) {
  return new Promise(res => {
    const dlg = $('dlg');
    $('dlgTitle').textContent = { sector: 'Novo setor', unit: 'Nova unidade', color: 'Nova cor' }[kind];
    $('dlgName').value = '';
    $('dlgIcons').hidden = kind !== 'sector';
    $('dlgColorLabel').hidden = kind === 'unit';
    if (kind === 'sector') {
      $('dlgIcons').replaceChildren(...ICONS.map((ic, i) => {
        const l = document.createElement('label'), r = document.createElement('input'), s = document.createElement('span');
        r.type = 'radio'; r.name = 'ic'; r.value = ic; r.checked = i === 0; s.textContent = ic; l.append(r, s); return l;
      }));
    }
    dlg.onclose = () => res(dlg.returnValue === 'ok' && $('dlgName').value.trim()
      ? { name: $('dlgName').value.trim(), icon: ($('dlgIcons').querySelector('input:checked') || {}).value, color: $('dlgColor').value } : null);
    dlg.showModal(); $('dlgName').focus();
  });
}

// ---------- Campos do formulário ----------
function fillSelect(id, opts, placeholder, value) {
  const s = $(id); s.replaceChildren();
  const add = (v, t, dis) => { const o = document.createElement('option'); o.value = v; o.textContent = t; if (dis) o.disabled = true; s.append(o); };
  add('', placeholder, true);
  [...opts].sort((a, b) => a.t.localeCompare(b.t, 'pt-BR')).forEach(o => add(o.v, o.t));
  add(NEW, '+ Adicionar...'); s.value = value || '';
}
function fillSelects(sector = $('itemSector').value, unit = $('itemUnit').value) {
  fillSelect('itemSector', st.sectors.map(s => ({ v: s.id, t: `${s.icon} ${s.name}` })), 'Selecione o setor...', sector);
  fillSelect('itemUnit', st.units.map(u => ({ v: u, t: u })), 'Selecione a unidade...', unit);
}
function fillColors(value = '') {
  color = st.colors.find(c => c.name === value) || null;
  const list = $('colorList'); list.replaceChildren();
  [null, ...st.colors].forEach(c => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'dot' + (c === color ? ' sel' : '');
    b.setAttribute('role', 'option'); b.setAttribute('aria-selected', c === color);
    b.title = c ? c.name : 'Sem cor'; b.setAttribute('aria-label', b.title);
    if (c) b.style.setProperty('--c', c.hex); else b.textContent = '✕';
    b.onclick = () => { fillColors(c ? c.name : ''); closeColors(); };
    list.append(b);
  });
  $('colorDot').style.setProperty('--c', color ? color.hex : 'transparent');
  $('colorDot').textContent = color ? '' : '✕';
  $('colorBtn').title = (color ? color.name + ' - ' : '') + 'Clique para escolher; botão direito para adicionar cor';
}
function closeColors() { $('colorList').hidden = true; $('colorBtn').setAttribute('aria-expanded', 'false'); }
$('colorBtn').onclick = () => { const h = !$('colorList').hidden; closeColors(); if (!h) { $('colorList').hidden = false; $('colorBtn').setAttribute('aria-expanded', 'true'); } };
document.addEventListener('click', e => { if (!e.target.closest('.colorfield')) closeColors(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeColors(); });
document.querySelector('.colorfield').oncontextmenu = async e => {
  e.preventDefault(); closeColors();
  const n = await ask('color'); if (!n) return;
  if (st.colors.some(c => c.name.toLowerCase() === n.name.toLowerCase())) return alert('Essa cor já existe.');
  st.colors.push({ name: n.name, hex: n.color }); save(st); fillColors(n.name);
};
const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const refresh = () => {
  render(st, listMode, { toggle, edit, remove, select });
  renderResults(st, searches, norm);
  if (listMode) renderList(st, { price, store });
};

$('itemSector').onchange = async e => {
  if (e.target.value !== NEW) return;
  const n = await ask('sector'); const name = n && n.name.toUpperCase();
  if (name && !st.sectors.some(s => s.name === name)) {
    st.sectors.push({ id: slug(name) + '-' + Date.now().toString(36), name, icon: n.icon, color: n.color }); save(st); fillSelects(st.sectors.at(-1).id); refresh();
  } else fillSelects('');
};
$('itemUnit').onchange = async e => {
  if (e.target.value !== NEW) return;
  const n = await ask('unit');
  if (n && !st.units.includes(n.name)) { st.units.push(n.name); save(st); fillSelects(undefined, n.name); } else fillSelects(undefined, '');
};
$('itemName').oninput = e => {
  const v = e.target.value.toLowerCase();
  for (const [id, words] of Object.entries(KEYWORDS))
    if (st.sectors.some(s => s.id === id) && words.some(w => v.includes(w))) { $('itemSector').value = id; break; }
};

// ---------- Salvar / editar / excluir ----------
$('itemForm').onsubmit = e => {
  e.preventDefault();
  const sectorId = $('itemSector').value;
  if (!sectorId || sectorId === NEW) return alert('Selecione um setor.');
  const unit = $('itemUnit').value === NEW ? '' : $('itemUnit').value;
  const data = { name: $('itemName').value.trim(), sectorId, qty: $('itemQty').value, unit, color, notes: $('itemNotes').value.trim() };
  if (editing) { Object.assign(st.items.find(i => i.id === editing), data); }
  else {
    st.items.push({ id: Date.now(), done: false, ...data });
  }
  save(st); resetForm(); refresh();
};
function resetForm() {
  editing = null; color = null; $('itemName').value = ''; $('itemQty').value = ''; $('itemNotes').value = '';
  $('submitBtn').textContent = 'Adicionar item'; $('cancelEdit').hidden = true; fillSelects(undefined, ''); fillColors('');
}
$('cancelEdit').onclick = resetForm;
function edit(id) {
  const it = st.items.find(i => i.id === id); editing = id; color = it.color;
  $('itemName').value = it.name; $('itemQty').value = it.qty; $('itemNotes').value = it.notes;
  fillSelects(it.sectorId, it.unit); fillColors(it.color ? it.color.name : '');
  $('submitBtn').textContent = 'Salvar alterações'; $('cancelEdit').hidden = false; $('itemName').focus(); scrollTo({ top: 0, behavior: 'smooth' });
}
function toggle(id) { const it = st.items.find(i => i.id === id); it.done = !it.done; save(st); refresh(); }
function remove(id) { if (confirm('Excluir este item?')) { st.items = st.items.filter(i => i.id !== id); save(st); refresh(); } }

// ---------- Busca entre setores ----------
$('searchForm').onsubmit = e => {
  e.preventDefault();
  $('q').value.split(/[,;]/).map(t => t.trim()).filter(Boolean)
    .forEach(t => { if (!searches.some(x => norm(x) === norm(t))) searches.push(t); });
  $('q').value = ''; refresh();
};

// ---------- Criar lista ----------
$('listMode').onclick = () => {
  listMode = !listMode;
  $('listMode').setAttribute('aria-pressed', listMode); $('listMode').classList.toggle('active', listMode);
  $('listPanel').hidden = !listMode; refresh();
};
function select(id) { const a = st.list.ids, i = a.indexOf(id); if (i < 0) a.push(id); else a.splice(i, 1); save(st); refresh(); }
function store(id, v) { st.list.stores[id] = v; save(st); }
function price(id, v) { st.list.prices[id] = v; save(st); updateTotals(st); }
$('clearList').onclick = () => { if (confirm('Limpar a lista?')) { st.list.ids = []; st.list.prices = {}; st.list.stores = {}; save(st); refresh(); } };
$('printBtn').onclick = () => window.print();
$('xlsxBtn').onclick = async () => {
  try { await exportXlsx(st); } catch { alert('Não foi possível gerar o .xlsx. Verifique a conexão com a internet.'); }
};

fillSelects('', ''); fillColors(''); refresh();
