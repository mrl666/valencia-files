// Scrape Aspe town news via WordPress RSS feed
// Source: https://aspe.es/feed/

const LIST_URL = 'https://aspe.es/feed/';

async function run() {
  console.error('region.js starting…');

  const res = await fetch(LIST_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; ValenciaFiles/1.0; +https://github.com/mrl666/valencia-files)',
      'Accept': 'application/rss+xml, application/xml, text/xml, */*'
    },
    redirect: 'follow'
  });
  if (!res.ok) throw new Error(`Aspe RSS HTTP ${res.status}`);
  const xml = await res.text();

  const items = [];
  const seen = new Set();

  // RSS pattern: <item> <title>...</title> <link>...</link> <pubDate>...</pubDate> </item>
  const itemRe = /<item>([\s\S]*?)<\/item>/g;

  let m;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];

    const titleMatch = block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
    const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/);
    const dateMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/);

    if (!titleMatch || !linkMatch) continue;

    const title = titleMatch[1].replace(/<[^>]+>/g, '').trim();
    const url = linkMatch[1].trim();

    if (!title || title.length < 10 || seen.has(url)) continue;

    // Convert RFC 822 date to YYYY-MM-DD
    let date = '';
    if (dateMatch) {
      const d = new Date(dateMatch[1]);
      if (!isNaN(d)) {
        date = d.toISOString().slice(0, 10);
      }
    }

    const id = url.split('/').filter(Boolean).pop() || url;
    seen.add(url);
    items.push({ id, title, url, date });
  }

  console.error(`region.js extracted ${items.length} items from Aspe`);
  console.log(JSON.stringify(items.slice(0, 10)));
}

run()
  .then(() => console.error('region.js finished OK'))
  .catch(err => {
    console.error('Region scrape error:', err.message);
    process.exit(1);
  });
