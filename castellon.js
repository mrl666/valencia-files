// Scrape Castellón city news
// Source: https://www.castello.es/es/noticies

const BASE = 'https://www.castello.es';
const LIST_URL = 'https://www.castello.es/es/noticies';

async function run() {
  console.error('castellon.js starting…');

const res = await fetch(LIST_URL, {
  method: 'GET',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
    'Connection': 'keep-alive'
  },
  redirect: 'follow'
});
  if (!res.ok) throw new Error(`Castellón HTTP ${res.status}`);
  const html = await res.text();

  const items = [];
  const seen = new Set();

  // Pattern: <a href="..."> <h3>TITLE</h3> </a> ... <p class="...date">DD/MM/YYYY</p>
  const re = /<a[^>]+href="([^"]+)"[^>]*>\s*<h3>([\s\S]*?)<\/h3>\s*<\/a>([\s\S]{0,800}?)<p[^>]*class="[^"]*three-columns-news__item__date[^"]*"[^>]*>\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/g;

  let m;
  while ((m = re.exec(html)) !== null) {
    const url = m[1];
    if (seen.has(url)) continue;

    const title = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (!title || title.length < 12) continue;

    const day = String(m[4]).padStart(2, '0');
    const month = String(m[5]).padStart(2, '0');
    const year = m[6];
    const date = `${year}-${month}-${day}`;

    const id = url.split('/').filter(Boolean).pop() || url;
    seen.add(url);
    items.push({
      id,
      title,
      url: url.startsWith('http') ? url : BASE + url,
      date
    });
  }

  console.error(`castellon.js extracted ${items.length} items`);
  console.log(JSON.stringify(items.slice(0, 20)));
}

run()
  .then(() => console.error('castellon.js finished OK'))
  .catch(err => {
    console.error('Castellón scrape error:', err.message);
    process.exit(1);
  });
