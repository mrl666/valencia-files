// Scrape Valencia city news — 2 pages of "Últimas noticias"
// Source: https://www.valencia.es/cas/actualidad/

const BASE = 'https://www.valencia.es';
const LIST_URL = 'https://www.valencia.es/cas/noticia/-/asset_publisher/R6s7fmDk1GN5/';
console.error('valencia.js starting…');

async function fetchPage(page) {
  const url = page === 1
    ? LIST_URL
    : `${LIST_URL}?p_p_state=normal&_p_p_state=normal&delta=20&p_p_id=R6s7fmDk1GN5&p_p_lifecycle=0&p_p_mode=view&_R6s7fmDk1GN5_delta=20&_R6s7fmDk1GN5_cur=${page}`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'ValenciaFiles/1.0 (+github.com/mrl666/valencia-files)' }
  });
  if (!res.ok) throw new Error(`Valencia page ${page} HTTP ${res.status}`);
  return res.text();
}

function extractItems(html) {
  const items = [];
  // Each news item: <a href="/cas/noticia/..."> ... <h2 or h3>TITLE</h2> ... DATE
  // We anchor on the article links, then look for the title and the date nearby.
  const linkRe = /<a[^>]+href="(\/cas\/noticia\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  let m;
  while ((m = linkRe.exec(html)) !== null) {
    const url = m[1];
    const inner = m[2];
    // Title: first heading-like text or link text
    const titleMatch = inner.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i);
    const rawTitle = titleMatch ? titleMatch[1] : inner;
    const title = rawTitle.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (!title || title.length < 12) continue;

    // Date: look for dd/mm/yyyy near this item in the whole html
    const slice = html.slice(m.index, m.index + 2000);
    const dateMatch = slice.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    const date = dateMatch ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}` : '';
    const id = url.split('/').filter(Boolean).pop() || url;

    items.push({ id, title, url: BASE + url, date });
  }
  return items;
}

async function run() {
  const seen = new Set();
  const all = [];
  for (const page of [1, 2]) {
    const html = await fetchPage(page);
    for (const item of extractItems(html)) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      all.push(item);
    }
  }
  console.log(JSON.stringify(all));
}

run().catch(err => {
  console.error('Valencia scrape error:', err.message);
  process.exit(1);
});
