const BASE = 'https://www.valencia.es';
const LIST_URL = 'https://www.valencia.es/cas/actualidad/';

async function run() {
  const res = await fetch(LIST_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; ValenciaFiles/1.0; +https://github.com/mrl666/valencia-files)',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
    },
    redirect: 'follow'
  });
  if (!res.ok) throw new Error(`Valencia HTTP ${res.status}`);
  const html = await res.text();

  const items = [];
  const seen = new Set();

  // Each news item on actualidad/ has a headline link and a date (dd/mm/yyyy)
  // Pattern: <a href="/cas/noticia/...">HEADLINE</a> ... DATE
  const itemRe = /<a[^>]+href="(\/cas\/(?:noticia|actualidad)\/[^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]{0,800}?(\d{2}\/\d{2}\/\d{4})/g;

  let m;
  while ((m = itemRe.exec(html)) !== null) {
    const url = m[1];
    if (seen.has(url)) continue;

    const title = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (!title || title.length < 15) continue;

    const [dd, mm, yyyy] = m[3].split('/');
    const date = `${yyyy}-${mm}-${dd}`;
    const id = url.split('/').filter(Boolean).pop() || url;

    seen.add(url);
    items.push({ id, title, url: BASE + url, date });
  }

  console.log(JSON.stringify(items.slice(0, 20)));
}

run().catch(err => {
  console.error('Valencia scrape error:', err.message);
  process.exit(1);
});
