// Scrape Alicante city news
// Source: https://www.alicante.es/es/noticias/la-ciudad

const BASE = 'https://www.alicante.es';
const LIST_URL = 'https://www.alicante.es/es/noticias/la-ciudad';

console.error('alicante.js starting…');

async function run() {
  const res = await fetch(LIST_URL, {
    headers: { 'User-Agent': 'ValenciaFiles/1.0 (+github.com/mrl666/valencia-files)' }
  });
  if (!res.ok) throw new Error(`Alicante HTTP ${res.status}`);
  const html = await res.text();

  const items = [];
  const seen = new Set();

  // Each news card: <a href="/es/noticia/..."> ... <h2 or h3>Title</h2> ... "Publicado el DD Mon YYYY"
  const linkRe = /<a[^>]+href="(\/es\/noticia\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  let m;
  while ((m = linkRe.exec(html)) !== null) {
    const url = m[1];
    if (seen.has(url)) continue;

    const titleMatch = m[2].match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i);
    const rawTitle = titleMatch ? titleMatch[1] : m[2];
    const title = rawTitle.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (!title || title.length < 12) continue;

    const slice = html.slice(m.index, m.index + 1500);
    // Spanish date: "16 mar 2026" or "16 de marzo de 2026"
    const months = { ene:'01', feb:'02', mar:'03', abr:'04', may:'05', jun:'06',
                     jul:'07', ago:'08', sep:'09', oct:'10', nov:'11', dic:'12',
                     enero:'01', febrero:'02', marzo:'03', abril:'04', mayo:'05', junio:'06',
                     julio:'07', agosto:'08', septiembre:'09', octubre:'10', noviembre:'11', diciembre:'12' };
    const dateMatch = slice.match(/(\d{1,2})\s+(?:de\s+)?([a-záéíóú]+)\s+(?:de\s+)?(\d{4})/i);
    let date = '';
    if (dateMatch) {
      const mm = months[dateMatch[2].toLowerCase()];
      if (mm) date = `${dateMatch[3]}-${mm}-${String(dateMatch[1]).padStart(2, '0')}`;
    }

    const id = url.split('/').filter(Boolean).pop() || url;
    seen.add(url);
    items.push({ id, title, url: BASE + url, date });
  }

  console.log(JSON.stringify(items.slice(0, 20)));
}

console.error('alicante.js done');
run()
  .then(() => console.error('alicante.js finished OK'))
  .catch(err => {
    console.error('Alicante scrape error:', err.message);
    process.exit(1);
  });
