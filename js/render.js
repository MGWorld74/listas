// Usa textContent (nunca innerHTML) para evitar injeção de código.
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };

export function render(st, filter, cb) {
  const box = document.getElementById('sectors'); box.replaceChildren();
  const q = filter.trim().toLowerCase();
  st.sectors.forEach(sec => {
    const items = st.items.filter(i => i.sectorId === sec.id && (!q || i.name.toLowerCase().includes(q)))
      .sort((a, b) => a.done - b.done);
    const card = el('section', 'sector'); card.style.setProperty('--sc', sec.color);
    const head = el('header', 'sector-head');
    head.append(el('span', 'logo', sec.icon), el('h2', '', sec.name), el('span', 'count', items.length));
    card.append(head);
    if (!items.length) card.append(el('p', 'empty', 'Nenhum item neste setor.'));
    items.forEach(it => card.append(itemCard(it, sec, cb)));
    box.append(card);
  });
}

function itemCard(it, sec, cb) {
  const row = el('div', 'item' + (it.done ? ' done' : ''));
  const chk = el('input'); chk.type = 'checkbox'; chk.checked = it.done; chk.style.width = 'auto';
  chk.setAttribute('aria-label', 'Concluído'); chk.onchange = () => cb.toggle(it.id);
  const body = el('div', 'body');
  const info = [it.qty, it.unit].filter(Boolean).join(' ');
  if (info || it.color) {
    const meta = el('div', 'meta');
    if (it.color) { const d = el('span', 'dot'); d.style.setProperty('--c', it.color.hex); d.title = it.color.name; meta.append(d); }
    meta.append(el('span', '', info)); body.append(meta);
  }
  body.append(el('div', 'name', it.name));
  if (it.notes) body.append(el('div', 'notes', it.notes));
  const acts = el('div', 'acts');
  const a = el('a', '', '🔍'); a.href = 'https://www.google.com/search?q=' + encodeURIComponent('"' + it.name + '"');
  a.target = '_blank'; a.rel = 'noopener'; a.title = 'Buscar no Google';
  const ed = el('button', '', '✏️'); ed.title = 'Editar'; ed.onclick = () => cb.edit(it.id);
  const del = el('button', '', '🗑️'); del.title = 'Excluir'; del.onclick = () => cb.remove(it.id);
  acts.append(a, ed, del);
  row.append(chk, body, acts);
  return row;
}
