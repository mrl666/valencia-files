// Transport & Roads scraper — Ministerio de Transportes (Mitma)
const BASE = 'https://www.transportes.gob.es';
const URL = 'https://www.transportes.gob.es/ministerio/comunicacion/sala-prensa?field_scope=173&field_new_area=All&fulltext=&field_date_value_min=&field_date_value_max=';

function cleanTitle(raw) {
  return String(raw || '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function run() {
  console.error('transport.js starting…');

  const res = await fetch(URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ValenciaFiles/1.0)' }
  });
  
  if (!res.ok) throw new Error(`Mitma HTTP ${res.status}`);
  const html = await res.text();
  console.error(`  HTML length: ${html.length}`);

  const items = [];
  const seen = new Set();

  // Matches the link, title, and date (DD-MM-YYYY)
  const re = /<a[^>]+href="([^"]*sala-prensa[^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]{0,800}?(\d{2})-(\d{2})-(\d{4})/g;

  let m;
  while ((m = re.exec(html)) !== null) {
    const url = m[1];
    if (seen.has(url)) continue;

    const title = cleanTitle(m[2]);
    if (!title || title.length < 15) continue;

    const date = `${m[5]}-${m[4]}-${m[3]}`;
    const id = `mitma-${url.split('/').filter(Boolean).pop() || url}`;
    
    seen.add(url);
    items.push({
      id,
      title,
      url: url.startsWith('http') ? url : BASE + url,
      date,
      town: 'Mitma',
      sourceLabel: 'Ministerio de Transportes'
    });
  }

  console.error(`transport.js extracted ${items.length} items`);
  console.log(JSON.stringify(items.slice(0, 10)));
}

run()
  .then(() => console.error('transport.js finished OK'))
  .catch(err => {
    console.error('Transport scrape error:', err.message);
    console.log('[]');
    process.exit(0);
  });
