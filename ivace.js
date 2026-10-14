// IVACE — Instituto Valenciano de Competitividad Empresarial
// Source: https://innovacion.ivace.es/index.php/es/noticias/notas-de-prensa
// Output: ivace.json in the same shape as region items.

const BASE = 'https://innovacion.ivace.es';
const LIST_URL = 'https://innovacion.ivace.es/index.php/es/noticias/notas-de-prensa';

function cleanTitle(raw) {
  return String(raw || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&#8217;/g, '’')
    .replace(/&#8211;/g, '–')
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function run() {
  console.error('ivace.js starting…');

  const res = await fetch(LIST_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; ValenciaFiles/1.0; +https://github.com/mrl666/valencia-files)',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'es-ES,es;q=0.9'
    },
    redirect: 'follow'
  });
  if (!res.ok) throw new Error(`IVACE HTTP ${res.status}`);
  const html = await res.text();
  console.error(`  HTML length: ${html.length}`);

  const items = [];
  const seen = new Set();

  // Pattern: anchor to a notas-de-prensa article URL, grab the title text,
  // then look ahead for a date in DD-MM-YYYY or DD/MM/YYYY format.
  const re = /<a[^>]+href="([^"]*notas-de-prensa[^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]{0,600}?\((\d{1,2})[-\/](\d{1,2})[-\/](\d{4})\)/g;

  let m;
  while ((m = re.exec(html)) !== null) {
    const url = m[1];
    if (seen.has(url)) continue;

    const title = cleanTitle(m[2]);
    if (!title || title.length < 20 || title.length > 220) continue;
    if (/notas-de-prensa\/?$/.test(url)) continue; // skip the listing page itself

    const day = String(m[3]).padStart(2, '0');
    const month = String(m[4]).padStart(2, '0');
    const year = m[5];
    const date = `${year}-${month}-${day}`;

    const id = `ivace-${url.split('/').filter(Boolean).pop() || url}`;
    seen.add(url);
    items.push({
      id,
      title,
      url: url.startsWith('http') ? url : BASE + url,
      date,
      town: 'IVACE',
      sourceLabel: 'IVACE+i — Generalitat Valenciana'
    });
  }

  console.error(`ivace.js extracted ${items.length} items`);
  console.log(JSON.stringify(items.slice(0, 15)));
}

run()
  .then(() => console.error('ivace.js finished OK'))
  .catch(err => {
    console.error('IVACE scrape error:', err.message);
    console.log('[]');
    process.exit(0); // never break the pipeline
  });
