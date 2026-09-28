// Region scraper — combines multiple town RSS feeds into one pool.
// Sources (all official council websites, reusable under Law 37/2007):
//   - Aspe:    https://aspe.es/feed/
//   - Torrent: https://www.torrent.es/feed/
//   - Alzira:  https://www.alzira.es/feed/

const SOURCES = [
  { name: 'Aspe',    url: 'https://aspe.es/feed/',        label: 'Ayuntamiento de Aspe' },
  { name: 'Torrent', url: 'https://www.torrent.es/feed/', label: 'Ajuntament de Torrent' },
  { name: 'Alzira',  url: 'https://www.alzira.es/feed/',  label: 'Ajuntament d\'Alzira' }
];

async function fetchFeed(source) {
  const res = await fetch(source.url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; ValenciaFiles/1.0; +https://github.com/mrl666/valencia-files)',
      'Accept': 'application/rss+xml, application/xml, text/xml, */*'
    },
    redirect: 'follow'
  });
  if (!res.ok) throw new Error(`${source.name} HTTP ${res.status}`);
  const xml = await res.text();

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

    const title = titleMatch[1]
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&#8217;/g, '’')
      .replace(/&#8211;/g, '–')
      .replace(/&#039;/g, "'")
      .replace(/&quot;/g, '"')
      .trim();

    const url = linkMatch[1].trim();
    if (!title || title.length < 10 || seen.has(url)) continue;

    let date = '';
    if (dateMatch) {
      const d = new Date(dateMatch[1]);
      if (!isNaN(d)) date = d.toISOString().slice(0, 10);
    }

    const id = `${source.name.toLowerCase()}-${url.split('/').filter(Boolean).pop() || url}`;
    seen.add(url);
    items.push({
      id,
      title,
      url,
      date,
      town: source.name,
      sourceLabel: source.label
    });
  }

  console.error(`${source.name}: ${items.length} items`);
  return items;
}

async function run() {
  console.error('region.js starting…');

  const all = [];
  for (const source of SOURCES) {
    try {
      const items = await fetchFeed(source);
      all.push(...items);
    } catch (e) {
      console.error(`Skipping ${source.name}: ${e.message}`);
    }
  }

  // Cap the pool at 30 items total, newest first
  all.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const pool = all.slice(0, 30);

  console.error(`region.js extracted ${pool.length} items total`);
  console.log(JSON.stringify(pool));
}

run()
  .then(() => console.error('region.js finished OK'))
  .catch(err => {
    console.error('Region scrape error:', err.message);
    process.exit(1);
  });
