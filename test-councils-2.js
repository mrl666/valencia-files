const TOWNS = [
  { name: 'Xàtiva',  base: 'https://www.xativa.es' },
  { name: 'Novelda', base: 'https://www.novelda.es' }
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
  for (const town of TOWNS) await testTown(town);
}

run().catch(err => {
  console.error('Test error:', err.message);
  process.exit(1);
});
