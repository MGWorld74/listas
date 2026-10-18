import { ICONS, KEYWORDS } from './config.js';
import { load, save, exportJSON, importJSON } from './storage.js';
import { render } from './render.js';
import { findImage } from './images.js';

let st = load(); let editing = null; let color = null;
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
function renderColors() {
  const box = $('colors'); box.replaceChildren();
  const mk = (value, title, bg, txt) => {
    const l = document.createElement('label'), r = document.createElement('input'), d = document.createElement('span');
    r.type = 'radio'; r.name = 'cor'; r.value = value; r.checked = (color ? color.name : '') === value;
    l.title = title; d.className = 'dot'; d.style.setProperty('--c', bg || 'transparent'); d.textContent = txt || '';
    r.setAttribute('aria-label', title);
    r.onchange = () => { color = st.colors.find(c => c.name === value) || null; };
    l.append(r, d); box.append(l);
  };
  mk('', 'Sem cor', '', '✕');
  st.colors.forEach(c => mk(c.name, c.name, c.hex));
  const plus = document.createElement('button'); plus.type = 'button'; plus.className = 'dot'; plus.textContent = '+'; plus.title = 'Adicionar cor';
  plus.onclick = async () => { const n = await ask('color'); if (n && !st.colors.some(c => c.name === n.name)) { st.colors.push({ name: n.name, hex: n.color }); color = st.colors.at(-1); save(st); renderColors(); } };
  box.append(plus);
}
const refresh = () => render(st, $('filter').value, { toggle, edit, remove });

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
$('newSector').onclick = () => { $('itemSector').value = NEW; $('itemSector').onchange({ target: $('itemSector') }); };
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
    const it = { id: Date.now(), done: false, image: '', ...data }; st.items.push(it);
    findImage(it.name).then(img => { if (img) { it.image = img; save(st); refresh(); } });
  }
  save(st); resetForm(); refresh();
};
function resetForm() {
  editing = null; color = null; $('itemName').value = ''; $('itemQty').value = ''; $('itemNotes').value = '';
  $('submitBtn').textContent = 'Adicionar item'; $('cancelEdit').hidden = true; fillSelects(undefined, ''); renderColors();
}
$('cancelEdit').onclick = resetForm;
function edit(id) {
  const it = st.items.find(i => i.id === id); editing = id; color = it.color;
  $('itemName').value = it.name; $('itemQty').value = it.qty; $('itemNotes').value = it.notes;
  fillSelects(it.sectorId, it.unit); renderColors();
  $('submitBtn').textContent = 'Salvar alterações'; $('cancelEdit').hidden = false; $('itemName').focus(); scrollTo({ top: 0, behavior: 'smooth' });
}
function toggle(id) { const it = st.items.find(i => i.id === id); it.done = !it.done; save(st); refresh(); }
function remove(id) { if (confirm('Excluir este item?')) { st.items = st.items.filter(i => i.id !== id); save(st); refresh(); } }

// ---------- Backup e filtro ----------
$('filter').oninput = refresh;
$('exportBtn').onclick = () => exportJSON(st);
$('importBtn').onclick = () => $('importFile').click();
$('importFile').onchange = async e => {
  try { if (confirm('Substituir os dados atuais pelo backup?')) { st = await importJSON(e.target.files[0]); save(st); resetForm(); refresh(); } }
  catch { alert('Arquivo de backup inválido.'); }
  e.target.value = '';
};

fillSelects('', ''); renderColors(); refresh();
