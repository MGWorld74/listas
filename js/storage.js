import { DEFAULTS } from './config.js';
const KEY = 'listasSetores.v2';
const slug = n => n.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'setor';
const old = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };

export function load() {
  const s = old(KEY);
  if (s && Array.isArray(s.items)) return s;
  return migrate();
}
export function save(st) {
  try { localStorage.setItem(KEY, JSON.stringify(st)); } catch { alert('Não foi possível salvar. Exporte um backup.'); }
}
// Converte os dados da versão antiga (itemsList, sectorsList...) para o formato novo
function migrate() {
  const st = structuredClone(DEFAULTS); st.items = [];
  const addSector = n => {
    let s = st.sectors.find(x => x.name === n);
    if (!s) { s = { id: slug(n), name: n, icon: '📁', color: '#6b7280' }; st.sectors.push(s); }
    return s;
  };
  (old('sectorsList') || []).forEach(addSector);
  (old('unidadesList') || []).forEach(u => { if (!st.units.includes(u)) st.units.push(u); });
  (old('itemsList') || []).forEach(o => st.items.push({
    id: o.id, name: o.name, sectorId: addSector(o.sector).id, qty: '', unit: '', color: null,
    notes: o.characteristics || '', done: false
  }));
  return st;
}
export function exportJSON(st) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(st, null, 2)], { type: 'application/json' }));
  a.download = 'listas-setores-backup.json'; a.click(); URL.revokeObjectURL(a.href);
}
export async function importJSON(file) {
  const data = JSON.parse(await file.text());
  if (!Array.isArray(data.items) || !Array.isArray(data.sectors)) throw new Error('Arquivo inválido');
  return data;
}
