// Scrape Castellón news from the EDUSI portal (most stable source found)
// Source: https://edusitransformacs.castello.es/actualidad/

const BASE = 'https://edusitransformacs.castello.es';
const LIST_URL = 'https://edusitransformacs.castello.es/actualidad/';

async function run() {
  const res = await fetch(LIST_URL, {
    headers: { 'User-Agent': 'ValenciaFiles/1.0 (+github.com/mrl666/valencia-files)' }
  });
  if (!res.ok) throw new Error(`Castellón HTTP ${res.status}`);
  const html = await res.text();

  const items = [];
  const seen = new Set();

  // Each news item: <a href="/actualidad/...">Title</a>
  const linkRe = /<a[^>]+href="([^"]*\/actualidad\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  let m;
  while ((m = linkRe.exec(html)) !== null) {
    const url = m[1];
    if (seen.has(url)) continue;

    const title = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (!title || title.length < 15) continue;

    const slice = html.slice(m.index, m.index + 1500);
    const dateMatch = slice.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    const date = dateMatch ? `${dateMatch[3]}-${dateMatch[2].padStart(2,'0')}-${dateMatch[1].padStart(2,'0')}` : '';

    const id = url.split('/').filter(Boolean).pop() || url;
    seen.add(url);
    items.push({ id, title, url: url.startsWith('http') ? url : BASE + url, date });
  }

  console.log(JSON.stringify(items.slice(0, 15)));
}

run().catch(err => {
  console.error('Castellón scrape error:', err.message);
  process.exit(1);
});
