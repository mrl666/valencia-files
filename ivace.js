// IVACE — Instituto Valenciano de Competitividad Empresarial
// Uses the Joomla RSS feed exposed on the news listing page.

const FEED_URL = 'https://innovacion.ivace.es/index.php/es/noticias/notas-de-prensa?format=feed&type=rss';

function cleanTitle(raw) {
  return String(raw || '')
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

  const res = await fetch(FEED_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; ValenciaFiles/1.0; +https://github.com/mrl666/valencia-files)',
      'Accept': 'application/rss+xml, application/xml, text/xml, */*'
    },
    redirect: 'follow'
  });
  if (!res.ok) throw new Error(`IVACE HTTP ${res.status}`);
  const xml = await res.text();
  console.error(`  XML length: ${xml.length}`);

  const items = [];
  const seen = new Set();
  const itemRe = /<item>([\s\S]*?)<\/item>/g;

  let m;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    const titleMatch = block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
    const linkMatch  = block.match(/<link>([\s\S]*?)<\/link>/);
    const dateMatch  = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
    if (!titleMatch || !linkMatch) continue;

    const title = cleanTitle(titleMatch[1]);
    if (!title || title.length < 15) continue;

    const url = linkMatch[1].trim();
    if (seen.has(url)) continue;

    let date = '';
    if (dateMatch) {
      const d = new Date(dateMatch[1]);
      if (!isNaN(d)) date = d.toISOString().slice(0, 10);
    }

    const id = `ivace-${url.split('/').filter(Boolean).pop() || url}`;
    seen.add(url);
    items.push({
      id,
      title,
      url,
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
    process.exit(0);
  });
