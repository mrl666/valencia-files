// Scrape Alicante city news
// Source: https://www.alicante.es/es/noticias/la-ciudad

const BASE = 'https://www.alicante.es';
const LIST_URL = 'https://www.alicante.es/es/noticias/la-ciudad';

const MONTHS = {
  ene: '01', feb: '02', mar: '03', abr: '04', may: '05', jun: '06',
  jul: '07', ago: '08', sep: '09', oct: '10', nov: '11', dic: '12'
};

async function run() {
  console.error('alicante.js starting…');

  const res = await fetch(LIST_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; ValenciaFiles/1.0; +https://github.com/mrl666/valencia-files)',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
    },
    redirect: 'follow'
  });
  if (!res.ok) throw new Error(`Alicante HTTP ${res.status}`);
  const html = await res.text();

  const items = [];
  const seen = new Set();

  // Pattern:
  // <h2 class="field-content"><a href="/es/noticias/...">TITLE</a></h2>
  // ...
  // <span class="...fecha_publicacion"> Publicado el 23 Sep 2026 </span>
  const re = /<h2[^>]*class="[^"]*field-content[^"]*"[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/h2>([\s\S]{0,1500}?)Publicado\s+el\s+(\d{1,2})\s+([A-Za-zÁÉÍÓÚáéíóú]+)\s+(\d{4})/g;

  let m;
  while ((m = re.exec(html)) !== null) {
    const url = m[1];
    if (seen.has(url)) continue;

    const title = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (!title || title.length < 12) continue;

    const day = String(m[4]).padStart(2, '0');
    const month = MONTHS[m[5].toLowerCase().slice(0, 3)];
    const year = m[6];
    const date = month ? `${year}-${month}-${day}` : '';

    const id = url.split('/').filter(Boolean).pop() || url;
    seen.add(url);
    items.push({
      id,
      title,
      url: url.startsWith('http') ? url : BASE + url,
      date
    });
  }

  console.error(`alicante.js extracted ${items.length} items`);
  console.log(JSON.stringify(items.slice(0, 20)));
}

run()
  .then(() => console.error('alicante.js finished OK'))
  .catch(err => {
    console.error('Alicante scrape error:', err.message);
    process.exit(1);
  });
