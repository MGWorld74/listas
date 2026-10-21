// A biblioteca SheetJS é carregada só quando você clica em "Salvar .xlsx"
const loadLib = () => window.XLSX ? Promise.resolve() : new Promise((ok, err) => {
  const s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  s.onload = ok; s.onerror = err; document.head.append(s);
});
// Linhas da lista atual: subtotal = preço × quantidade a comprar (1 se vazia)
export function snapshot(st) {
  const rows = []; let total = 0;
  st.sectors.forEach(sec => st.items.filter(i => i.sectorId === sec.id && st.list.ids.includes(i.id)).forEach(it => {
    const p = Number(st.list.prices[it.id]) || 0, b = Number(st.list.qtys[it.id]) || 0, sub = p * (b || 1); total += sub;
    rows.push([sec.name, it.name, it.color ? it.color.name : '', b || '', [it.qty, it.unit].filter(Boolean).join(' '), p || '', sub || '', st.list.stores[it.id] || '', it.notes || '']);
  }));
  return { rows, total };
}
export async function exportXlsx(rows, total, date = new Date()) {
  if (!rows.length) return alert('Marque ao menos um item para a lista.');
  await loadLib();
  const data = [['Data', date.toLocaleDateString('pt-BR')], [],
    ['Setor', 'Item', 'Cor', 'Qtd. a comprar', 'Medida', 'Preço unit. (R$)', 'Subtotal (R$)', 'Loja / Mercado', 'Observações'], ...rows,
    [], ['', '', '', '', '', 'Total (R$)', total]];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [16, 28, 12, 14, 16, 16, 14, 22, 32].map(wch => ({ wch }));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Lista');
  XLSX.writeFile(wb, `lista-${date.toISOString().slice(0, 10)}.xlsx`);
}
