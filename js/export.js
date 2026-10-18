import { info } from './render.js';
// A biblioteca SheetJS é carregada só quando você clica em "Salvar .xlsx"
const loadLib = () => window.XLSX ? Promise.resolve() : new Promise((ok, err) => {
  const s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  s.onload = ok; s.onerror = err; document.head.append(s);
});
export async function exportXlsx(st) {
  const rows = []; let total = 0;
  st.sectors.forEach(sec => st.items.filter(i => i.sectorId === sec.id && st.list.ids.includes(i.id)).forEach(it => {
    const p = Number(st.list.prices[it.id]) || 0, q = Number(it.qty) || 1, sub = p * q; total += sub;
    rows.push([sec.name, it.name, it.color ? it.color.name : '', it.qty ? Number(it.qty) : '', it.unit || '', p || '', sub || '', st.list.stores[it.id] || '', it.notes || '']);
  }));
  if (!rows.length) return alert('Marque ao menos um item para a lista.');
  await loadLib();
  const data = [['Data', new Date().toLocaleDateString('pt-BR')], [],
    ['Setor', 'Item', 'Cor', 'Qtd.', 'Unidade / Tipo', 'Preço unit. (R$)', 'Subtotal (R$)', 'Loja / Mercado', 'Observações'], ...rows,
    [], ['', '', '', '', '', 'Total (R$)', total]];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [16, 28, 12, 8, 16, 16, 14, 22, 32].map(wch => ({ wch }));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Lista');
  XLSX.writeFile(wb, `lista-compras-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
