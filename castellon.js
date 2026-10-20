// Castellón city news — scraped via ScrapingAnt (JS rendering required).
// Source: https://www.castello.es/es/noticies
// Structure: <li class="three-columns-news__item"> with <a><h3>Title</h3></a> and <p class="...date">DD/MM/YYYY</p>

const SCRAPINGANT_API_KEY = process.env.SCRAPINGANT_API_KEY;
const TARGET_URL = 'https://www.castello.es/es/noticies';
const BASE = 'https://www.castello.es';

function cleanTitle(raw) {
  return String(raw || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&#8217;/g, '’')
    .replace(/&#8211;/g, '–')
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchCastellon() {
  if (!SCRAPINGANT_API_KEY) {
    throw new Error('No SCRAPINGANT_API_KEY');
  }

  const params = new URLSearchParams({
    url: TARGET_URL,
    browser: 'true',
    wait_for_selector: '.three-columns-news__item',
    timeout: '60'
  });

  const res = await fetch(`https://api.scrapingant.com/v2/general?${params}`, {
    headers: { 'x-api-key': SCRAPINGANT_API_KEY }
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`ScrapingAnt HTTP ${res.status} — ${body.slice(0, 200)}`);
  }

  return res.text();
}

async function run() {
  console.error('castellon.js starting…');

  let html = '';
  try {
    html = await fetchCastellon();
    console.error(`  Rendered HTML: ${html.length} bytes`);
  } catch (e) {
    console.error(`  Fetch failed: ${e.message}`);
    console.log('[]');
    return;
  }

  const items = [];
  const seen = new Set();

  const itemRe = /<a[^>]+href="([^"]+)"[^>]*>\s*<h3>([\s\S]*?)<\/h3>\s*<\/a>([\s\S]{0,800}?)<p[^>]*class="[^"]*three-columns-news__item__date[^"]*"[^>]*>\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/g;

  let m;
  while ((m = itemRe.exec(html)) !== null) {
    const url = m[1];
    if (seen.has(url)) continue;

    const title = cleanTitle(m[2]);
    if (!title || title.length < 12) continue;

    const day = String(m[4]).padStart(2, '0');
    const month = String(m[5]).padStart(2, '0');
    const year = m[6];
    const date = `${year}-${month}-${day}`;

    const id = `castello-${url.split('/').filter(Boolean).pop() || url}`;
    seen.add(url);
    items.push({
      id,
      title,
      url: url.startsWith('http') ? url : BASE + url,
      date,
      town: 'Castelló',
      sourceLabel: 'Ajuntament de Castelló'
    });
  }

  console.error(`castellon.js extracted ${items.length} items`);
  console.log(JSON.stringify(items.slice(0, 15)));
}

run()
  .then(() => console.error('castellon.js finished OK'))
  .catch(err => {
    console.error('Castellón scrape error:', err.message);
    console.log('[]');
    process.exit(0);
  });
