// Busca uma miniatura na Wikipedia em português; retorna '' se não achar.
export async function findImage(name) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 4000);
  try {
    const u = 'https://pt.wikipedia.org/w/api.php?action=query&generator=search&gsrlimit=1&prop=pageimages&pithumbsize=100&format=json&origin=*&gsrsearch=' + encodeURIComponent(name);
    const d = await (await fetch(u, { signal: ctl.signal })).json();
    const p = d.query && Object.values(d.query.pages)[0];
    return (p && p.thumbnail && p.thumbnail.source) || '';
  } catch { return ''; } finally { clearTimeout(t); }
}
