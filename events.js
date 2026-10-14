// Events scraper — Diputació de València (turisme.dival.es)
// Source: https://turisme.dival.es/agenda/
// Structure: each event is an <a> wrapping .container_pre_agenda

const BASE = 'https://turisme.dival.es';
const LIST_URL = 'https://turisme.dival.es/agenda/';

function cleanText(raw) {
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
  console.error('events.js starting…');

  const res = await fetch(LIST_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; ValenciaFiles/1.0; +https://github.com/mrl666/valencia-files)',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'es-ES,es;q=0.9'
    },
    redirect: 'follow'
  });
  if (!res.ok) throw new Error(`Events HTTP ${res.status}`);
  const html = await res.text();
  console.error(`  HTML length: ${html.length}`);

  const items = [];
  const seen = new Set();

  // Each event: <a href="..."> ... <span class="title_per_agenda">TITLE</span> <p>DESC</p> ... <span>DD Month, YYYY</span>
  const eventRe = /<a[^>]+href="([^"]+)"[^>]*>[\s\S]*?<span class="title_per_agenda">([\s\S]*?)<\/span>[\s\S]*?<p>([\s\S]*?)<\/p>[\s\S]*?<span>(\d{1,2}\s+[A-Za-z]+,?\s+\d{4})<\/span>/g;

  let m;
  while ((m = eventRe.exec(html)) !== null) {
    const url = m[1];
    if (seen.has(url)) continue;

    const title = cleanText(m[2]);
    const description = cleanText(m[3]);
    const rawDate = m[4].trim();

    if (!title || title.length < 5) continue;

    // Parse "04 Diciembre, 2026" → "2026-12-04"
    const monthMap = {
      enero:'01', febrero:'02', marzo:'03', abril:'04', mayo:'05', junio:'06',
      julio:'07', agosto:'08', septiembre:'09', octubre:'10', noviembre:'11', diciembre:'12'
    };
    const dm = rawDate.match(/^(\d{1,2})\s+([A-Za-z]+),?\s+(\d{4})$/);
    let date = '';
    if (dm) {
      const month = monthMap[dm[2].toLowerCase()];
      if (month) date = `${dm[3]}-${month}-${dm[1].padStart(2, '0')}`;
    }

    const id = `event-${url.split('/').filter(Boolean).pop() || url}`;
    seen.add(url);
    items.push({
      id,
      title,
      description,
      url: url.startsWith('http') ? url : BASE + url,
      date,
      sourceLabel: 'Diputació de València — Agenda'
    });
  }

  console.error(`events.js extracted ${items.length} items`);
  console.log(JSON.stringify(items.slice(0, 20)));
}

run()
  .then(() => console.error('events.js finished OK'))
  .catch(err => {
    console.error('Events scrape error:', err.message);
    console.log('[]');
    process.exit(0);
  });
