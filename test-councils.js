// Bulk-test council news URLs for scrape-ability.
// Run locally with: node test-councils.js
// Or via GitHub Actions workflow_dispatch.

const TOWNS = [
  { name: 'Torrent',     base: 'https://www.torrent.es' },
  { name: 'Paterna',     base: 'https://www.paterna.es' },
  { name: 'Mislata',     base: 'https://www.mislata.es' },
  { name: 'Burjassot',   base: 'https://www.burjassot.es' },
  { name: 'Xirivella',   base: 'https://www.xirivella.es' },
  { name: 'Alfafar',     base: 'https://www.alfafar.es' },
  { name: 'Catarroja',   base: 'https://www.catarroja.es' },
  { name: 'Paiporta',    base: 'https://www.paiporta.es' },
  { name: 'Sagunt',      base: 'https://www.sagunt.es' },
  { name: 'Alzira',      base: 'https://www.alzira.es' },
  { name: 'Gandia',      base: 'https://www.gandia.es' },
  { name: 'Dénia',       base: 'https://www.denia.es' },
  { name: 'Xàbia',       base: 'https://www.xabia.es' },
  { name: 'Torrevieja',  base: 'https://www.torrevieja.es' },
  { name: 'Benidorm',    base: 'https://www.benidorm.org' },
  { name: 'Calpe',       base: 'https://www.calp.es' }
];

const PATHS = [
  '/es/noticias',
  '/es/noticies',
  '/es/actualidad',
  '/es/actualitat',
  '/es/noticias/',
  '/es/premsa',
  '/feed/',
  '/es/feed/',
  '/rss',
  '/es/rss'
];

// Headline heuristic: page contains <h1>, <h2>, or <h3> with ≥20 letters, AND
// some kind of date-like pattern, AND more than 5KB of HTML.
function looksLikeNews(html) {
  if (!html || html.length < 5000) return false;
  const headlineCount = (html.match(/<h[123][^>]*>[^<]{20,}<\/h[123]>/g) || []).length;
  const dateCount = (html.match(/\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/g) || []).length;
  return headlineCount >= 3 && dateCount >= 2;
}

async function tryUrl(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ValenciaFilesTest/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/rss+xml,application/xml'
      },
      redirect: 'follow'
    });
    if (!res.ok) return { url, ok: false, status: res.status };
    const html = await res.text();
    return {
      url,
      ok: true,
      status: res.status,
      size: html.length,
      news: looksLikeNews(html),
      isXml: html.trim().startsWith('<?xml') || html.includes('<rss')
    };
  } catch (e) {
    return { url, ok: false, error: e.message };
  }
}

async function testTown(town) {
  console.log(`\n=== ${town.name} (${town.base}) ===`);
  for (const path of PATHS) {
    const url = town.base + path;
    const r = await tryUrl(url);
    if (!r.ok) {
      console.log(`  ✗ ${path}  (${r.status || r.error})`);
      continue;
    }
    const tag = r.isXml ? '📡 XML' : r.news ? '✅ NEWS' : '? HTML';
    console.log(`  ${tag}  ${path}  [${r.size} bytes, status ${r.status}]`);
  }
}

async function run() {
  for (const town of TOWNS) {
    await testTown(town);
  }
}

run().catch(err => {
  console.error('Bulk test error:', err.message);
  process.exit(1);
});
