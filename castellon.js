// Scrape Diputació de Castelló news
// Source: https://www.dipcas.es/es/actualidad/
// Uses Open Graph metadata — robust against CSS changes.

const BASE = 'https://www.dipcas.es';
const LIST_URL = 'https://www.dipcas.es/es/actualidad/';

async function run() {
  console.error('castellon.js starting…');

  const res = await fetch(LIST_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'es-ES,es;q=0.9'
    }
  });
  if (!res.ok) throw new Error(`dipcas HTTP ${res.status}`);
  const html = await res.text();

  const items = [];
  const seen = new Set();

  // Find every news item by its og:url, then pick up the surrounding metadata.
  // Pattern: <meta property="og:url" content="..."> near og:title, og:description, og:image.
  const itemRe = /<meta\s+property="og:url"\s+content="([^"]+)"[\s\S]{0,4000}?<meta\s+property="og:title"\s+content="([^"]+)"[\s\S]{0,2000}?<meta\s+property="og:description"\s+content="([^"]*)"[\s\S]{0,2000}?<meta\s+property="og:image"\s+content="([^"]*)"/g;

  let m;
  while ((m = itemRe.exec(html)) !== null) {
    const url = m[1];
    const title = m[2].replace(/\s+/g, ' ').trim();
    const summary = m[3].replace(/\s+/g, ' ').trim();
    const image = m[4];

    if (!url || !title || title.length < 10) continue;
    if (seen.has(url)) continue;

    // Skip the site-wide "homepage" og:url
    if (url === 'https://www.dipcas.es//es/actualidad/') continue;

    const id = url.split('/').filter(Boolean).pop() || url;
    seen.add(url);

    items.push({
      id,
      title,
      summary,
      url: url.startsWith('http') ? url : BASE + url,
      image: image || null,
      date: '' // dipcas doesn't expose a clean date in og tags; leave empty for now
    });
  }

  console.error(`castellon.js extracted ${items.length} items`);
  console.log(JSON.stringify(items.slice(0, 20)));
}

run()
  .then(() => console.error('castellon.js finished OK'))
  .catch(err => {
    console.error('dipcas scrape error:', err.message);
    process.exit(1);
  });
