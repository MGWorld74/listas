// Usa textContent (nunca innerHTML) para evitar injeção de código.
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
const money = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const info = it => [it.unit, it.qty ? 'Qtd: ' + it.qty : ''].filter(Boolean).join(' • ');

export function render(st, listMode, cb) {
  const box = document.getElementById('sectors'); box.replaceChildren();
  st.sectors.forEach(sec => {
    const items = st.items.filter(i => i.sectorId === sec.id).sort((a, b) => a.done - b.done);
    const card = el('section', 'sector'); card.style.setProperty('--sc', sec.color);
    const head = el('header', 'sector-head');
    head.append(el('span', 'logo', sec.icon), el('h2', '', sec.name), el('span', 'count', items.length));
    card.append(head);
    if (!items.length) card.append(el('p', 'empty', 'Nenhum item neste setor.'));
    items.forEach(it => card.append(itemCard(it, st, listMode, cb)));
    box.append(card);
  });
}

function itemCard(it, st, listMode, cb) {
  const row = el('div', 'item' + (it.done && !listMode ? ' done' : ''));
  const chk = el('input'); chk.type = 'checkbox'; chk.style.width = 'auto';
  if (listMode) { chk.checked = st.list.ids.includes(it.id); chk.setAttribute('aria-label', 'Incluir na lista'); chk.onchange = () => cb.select(it.id); }
  else { chk.checked = it.done; chk.setAttribute('aria-label', 'Concluído'); chk.onchange = () => cb.toggle(it.id); }
  const body = el('div', 'body');
  body.append(el('div', 'name', it.name));
  if (info(it) || it.color) {
    const meta = el('div', 'meta');
    if (it.color) { const d = el('span', 'dot'); d.style.setProperty('--c', it.color.hex); d.title = it.color.name; d.style.width = d.style.height = '12px'; meta.append(d); }
    meta.append(el('span', '', info(it))); body.append(meta);
  }
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

// Resultados das buscas: um grupo por termo, um embaixo do outro
export function renderResults(st, terms, norm) {
  const box = document.getElementById('results'); box.replaceChildren(); box.hidden = !terms.length;
  terms.forEach(t => {
    const found = st.items.filter(i => norm(i.name).includes(norm(t)));
    const g = el('div', 'rgroup'); g.append(el('h3', '', `“${t}” — ${found.length} resultado(s)`));
    if (!found.length) g.append(el('p', 'empty', 'Nenhum item encontrado.'));
    found.forEach(it => {
      const sec = st.sectors.find(s => s.id === it.sectorId) || { icon: '📁', name: '' };
      const r = el('div', 'rrow'); r.append(el('span', 'rs', `${sec.icon} ${sec.name}`), el('strong', '', it.name));
      if (info(it)) r.append(el('span', 'notes', info(it)));
      g.append(r);
    });
    box.append(g);
  });
}

// Quadro da lista: itens marcados, agrupados por setor, com preço
export function renderList(st, cb) {
  const body = document.getElementById('listBody'); body.replaceChildren();
  document.getElementById('listDate').textContent = new Date().toLocaleDateString('pt-BR');
  let n = 0;
  st.sectors.forEach(sec => {
    const items = st.items.filter(i => i.sectorId === sec.id && st.list.ids.includes(i.id));
    if (!items.length) return;
    body.append(el('h3', 'list-sec', `${sec.icon} ${sec.name}`));
    const t = el('table', 'ltable'), head = el('tr');
    ['Item', 'Preço unit. (R$)', 'Subtotal'].forEach(x => head.append(el('th', '', x))); t.append(head);
    items.forEach(it => {
      n++; const tr = el('tr'), c1 = el('td'), c2 = el('td'), c3 = el('td', 'sub');
      c1.append(el('strong', '', it.name)); if (info(it)) c1.append(el('div', 'notes', info(it)));
      const inp = el('input'); inp.type = 'number'; inp.min = '0'; inp.step = '0.01'; inp.placeholder = '0,00';
      inp.value = st.list.prices[it.id] || ''; inp.setAttribute('aria-label', 'Preço de ' + it.name);
      inp.oninput = () => cb.price(it.id, inp.value);
      c2.append(inp); c3.dataset.id = it.id; tr.append(c1, c2, c3); t.append(tr);
    });
    body.append(t);
  });
  if (!n) body.append(el('p', 'empty', 'Marque os itens nos setores para montar a lista.'));
  updateTotals(st);
}

// Subtotal = preço unitário × quantidade (1 se não houver quantidade)
export function updateTotals(st) {
  let total = 0;
  document.querySelectorAll('#listBody .sub').forEach(td => {
    const it = st.items.find(i => String(i.id) === td.dataset.id); if (!it) return;
    const v = (Number(st.list.prices[it.id]) || 0) * (Number(it.qty) || 1); total += v; td.textContent = money(v);
  });
  document.getElementById('listTotal').textContent = 'Total: ' + money(total);
}
