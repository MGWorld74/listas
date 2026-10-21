import { ICONS, KEYWORDS } from './config.js';
import { load, save, slug, fix, exportJSON, importJSON } from './storage.js';
import { render, renderResults, renderList, updateTotals, renderSaved } from './render.js';
import { exportXlsx, snapshot } from './export.js';

let st = load(); let editing = null; let color = null; let listMode = false; let searches = []; let auto = false;
const $ = id => document.getElementById(id);
const NEW = '__new__';
const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const xlsxErr = () => alert('Não foi possível gerar o .xlsx. Verifique a conexão com a internet.');

// ---------- Diálogo para criar/editar setor, unidade ou cor ----------
function ask(kind, init = {}) {
  return new Promise(res => {
    const dlg = $('dlg');
    $('dlgTitle').textContent = { sector: init.name ? 'Editar setor' : 'Novo setor', unit: 'Nova unidade', color: 'Nova cor' }[kind];
    $('dlgName').value = init.name || ''; $('dlgColor').value = init.color || '#4f46e5';
    $('dlgIcons').hidden = kind !== 'sector';
    $('dlgColorLabel').hidden = kind === 'unit';
    if (kind === 'sector') {
      $('dlgIcons').replaceChildren(...ICONS.map((ic, i) => {
        const l = document.createElement('label'), r = document.createElement('input'), s = document.createElement('span');
        r.type = 'radio'; r.name = 'ic'; r.value = ic; r.checked = init.icon ? ic === init.icon : i === 0; s.textContent = ic; l.append(r, s); return l;
      }));
    }
    dlg.returnValue = '';
    dlg.onclose = () => res(dlg.returnValue === 'ok' && $('dlgName').value.trim()
      ? { name: $('dlgName').value.trim(), icon: ($('dlgIcons').querySelector('input:checked') || {}).value || init.icon, color: $('dlgColor').value } : null);
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
async function addColor() {
  closeColors();
  const n = await ask('color'); if (!n) return;
  if (st.colors.some(c => c.name.toLowerCase() === n.name.toLowerCase())) return alert('Essa cor já existe.');
  st.colors.push({ name: n.name, hex: n.color }); save(st); fillColors(n.name);
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
  const plus = document.createElement('button'); plus.type = 'button'; plus.className = 'dot'; plus.textContent = '+';
  plus.title = 'Adicionar cor'; plus.setAttribute('aria-label', 'Adicionar cor'); plus.onclick = addColor; list.append(plus);
  $('colorDot').style.setProperty('--c', color ? color.hex : 'transparent');
  $('colorDot').textContent = color ? '' : '✕';
  $('colorBtn').title = (color ? color.name + ' - ' : '') + 'Clique para escolher; use + para adicionar cor';
}
function closeColors() { $('colorList').hidden = true; $('colorBtn').setAttribute('aria-expanded', 'false'); }
$('colorBtn').onclick = () => { const h = !$('colorList').hidden; closeColors(); if (!h) { $('colorList').hidden = false; $('colorBtn').setAttribute('aria-expanded', 'true'); } };
document.addEventListener('click', e => { if (!e.target.closest('.colorfield')) closeColors(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeColors(); });
document.querySelector('.colorfield').oncontextmenu = e => { e.preventDefault(); addColor(); };

const cbs = { toggle, edit, remove, select, secMove, secEdit, secDel };
const refresh = () => {
  render(st, listMode, cbs);
  renderResults(st, searches, norm, { edit, drop: t => { searches = searches.filter(x => x !== t); refresh(); } });
  renderSaved(st, {
    xlsx: i => exportXlsx(st.saved[i].rows, st.saved[i].total, new Date(st.saved[i].date)).catch(xlsxErr),
    del: i => { if (confirm('Excluir esta lista salva?')) { st.saved.splice(i, 1); save(st); refresh(); } }
  });
  if (listMode) renderList(st, { price, store, qty, buyUnit });
};

$('itemSector').onchange = async e => {
  auto = false;
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
$('delUnit').onclick = () => {
  const u = $('itemUnit').value;
  if (!u || u === NEW) return alert('Selecione a unidade que deseja excluir.');
  if (confirm(`Excluir a unidade "${u}"? Os itens que a usam continuam com ela.`)) { st.units = st.units.filter(x => x !== u); save(st); fillSelects(undefined, ''); }
};
// Sugere o setor: primeiro pelo que já foi cadastrado antes, depois pelas palavras-chave.
// Nunca troca um setor que você mesmo escolheu.
$('itemName').oninput = e => {
  if ($('itemSector').value && !auto) return;
  const v = norm(e.target.value.trim()); if (!v) return;
  let id = st.learn[v];
  if (!id) for (const [k, words] of Object.entries(KEYWORDS)) if (words.some(w => v.includes(norm(w)))) { id = k; break; }
  if (id && st.sectors.some(s => s.id === id)) { $('itemSector').value = id; auto = true; }
};

// ---------- Setores: reordenar, editar, excluir ----------
function secMove(id, d) {
  const a = st.sectors, i = a.findIndex(s => s.id === id), j = i + d;
  if (j < 0 || j >= a.length) return;
  [a[i], a[j]] = [a[j], a[i]]; save(st); refresh();
}
async function secEdit(id) {
  const s = st.sectors.find(x => x.id === id), n = await ask('sector', s); if (!n) return;
  const name = n.name.toUpperCase();
  if (st.sectors.some(x => x.id !== id && x.name === name)) return alert('Já existe um setor com esse nome.');
  Object.assign(s, { name, icon: n.icon, color: n.color }); save(st); fillSelects(); refresh();
}
function secDel(id) {
  if (st.items.some(i => i.sectorId === id)) return alert('Mova ou exclua os itens deste setor antes de excluí-lo.');
  if (!confirm('Excluir este setor?')) return;
  st.sectors = st.sectors.filter(s => s.id !== id); save(st); fillSelects(''); refresh();
}

// ---------- Salvar / editar / excluir ----------
$('itemForm').onsubmit = e => {
  e.preventDefault();
  const sectorId = $('itemSector').value;
  if (!sectorId || sectorId === NEW) return alert('Selecione um setor.');
  const unit = $('itemUnit').value === NEW ? '' : $('itemUnit').value;
  const data = { name: $('itemName').value.trim(), sectorId, qty: $('itemQty').value, unit, color, content: $('itemContent').value.trim(), notes: $('itemNotes').value.trim() };
  if (!editing && st.items.some(i => i.sectorId === sectorId && norm(i.name) === norm(data.name)) &&
      !confirm('Já existe um item com esse nome neste setor. Adicionar mesmo assim?')) return;
  st.learn[norm(data.name)] = sectorId;
  if (editing) Object.assign(st.items.find(i => i.id === editing), data);
  else st.items.push({ id: Date.now(), done: false, ...data });
  save(st); resetForm(); refresh(); $('itemName').focus();
};
function resetForm() {
  editing = null; color = null; auto = false; $('itemName').value = ''; $('itemQty').value = ''; $('itemContent').value = ''; $('itemNotes').value = '';
  $('submitBtn').textContent = 'Adicionar item'; $('cancelEdit').hidden = true; fillSelects(undefined, ''); fillColors('');
}
$('cancelEdit').onclick = resetForm;
function edit(id) {
  const it = st.items.find(i => i.id === id); editing = id; color = it.color; auto = false;
  $('itemName').value = it.name; $('itemQty').value = it.qty; $('itemContent').value = it.content || ''; $('itemNotes').value = it.notes;
  fillSelects(it.sectorId, it.unit); fillColors(it.color ? it.color.name : '');
  $('submitBtn').textContent = 'Salvar alterações'; $('cancelEdit').hidden = false; $('itemName').focus(); scrollTo({ top: 0, behavior: 'smooth' });
}
function toggle(id) { const it = st.items.find(i => i.id === id); it.done = !it.done; save(st); refresh(); }
function remove(id) { if (confirm('Excluir este item?')) { st.items = st.items.filter(i => i.id !== id); fix(st); save(st); refresh(); } }
$('clearDone').onclick = () => {
  const n = st.items.filter(i => i.done).length;
  if (!n) return alert('Nenhum item concluído.');
  if (confirm(`Remover ${n} item(ns) concluído(s)?`)) { st.items = st.items.filter(i => !i.done); fix(st); save(st); refresh(); }
};

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
function buyUnit(id, v) { st.list.buyUnits[id] = v; save(st); }
function qty(id, v) { st.list.qtys[id] = v; save(st); updateTotals(st); }
$('clearList').onclick = () => { if (confirm('Limpar a lista?')) { st.list = { ids: [], prices: {}, qtys: {}, stores: {}, buyUnits: {} }; save(st); refresh(); } };
$('saveList').onclick = () => {
  const s = snapshot(st); if (!s.rows.length) return alert('Marque ao menos um item para a lista.');
  const name = prompt('Nome da lista:', 'Lista de ' + new Date().toLocaleDateString('pt-BR')); if (!name) return;
  st.saved.push({ name: name.trim().slice(0, 60), date: new Date().toISOString(), rows: s.rows, total: s.total }); save(st); refresh();
};
$('printBtn').onclick = () => window.print();
$('xlsxBtn').onclick = () => { const s = snapshot(st); exportXlsx(s.rows, s.total).catch(xlsxErr); };

// ---------- Backup ----------
$('backupBtn').onclick = () => exportJSON(st);
$('restoreBtn').onclick = () => $('restoreFile').click();
$('restoreFile').onchange = async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try {
    const d = await importJSON(f);
    if (!confirm('Substituir todos os dados atuais pelo backup?')) return;
    st = fix(d); st.unitsCleaned = true; save(st); resetForm(); refresh();
  } catch { alert('Arquivo de backup inválido.'); }
};

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
fillSelects('', ''); fillColors(''); refresh();
