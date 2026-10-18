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
    rows.push([sec.name, it.name, info(it), it.qty ? Number(it.qty) : '', p || '', sub || '']);
  }));
  if (!rows.length) return alert('Marque ao menos um item para a lista.');
  await loadLib();
  const data = [['Loja / Mercado', st.list.store || ''], ['Data', new Date().toLocaleDateString('pt-BR')], [],
    ['Setor', 'Item', 'Detalhes', 'Qtd.', 'Preço unit. (R$)', 'Subtotal (R$)'], ...rows, [], ['', '', '', '', 'Total (R$)', total]];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [{ wch: 16 }, { wch: 28 }, { wch: 26 }, { wch: 8 }, { wch: 16 }, { wch: 14 }];
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Lista');
  XLSX.writeFile(wb, `lista-${(st.list.store || 'compras').replace(/[^\w\-]+/g, '_')}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
