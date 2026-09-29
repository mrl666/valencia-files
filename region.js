// Region scraper — combines multiple town RSS feeds into one pool.
// Sources (all official council websites, reusable under Law 37/2007):
//   - Aspe:    https://aspe.es/feed/
//   - Torrent: https://www.torrent.es/feed/
//   - Alzira:  https://www.alzira.es/feed/

const SOURCES = [
  { name: 'Aspe',    url: 'https://aspe.es/feed/',         label: 'Ayuntamiento de Aspe',   type: 'rss' },
  { name: 'Torrent', url: 'https://www.torrent.es/feed/',  label: 'Ajuntament de Torrent',  type: 'rss' },
  { name: 'Alzira',  url: 'https://www.alzira.es/feed/',   label: 'Ajuntament d\'Alzira',   type: 'rss' },
  { name: 'Sagunt',  url: 'https://aytosagunto.es/va/actualitat/', label: 'Ajuntament de Sagunt', type: 'html' },
  { name: 'Novelda', url: 'https://www.novelda.es/feed/', label: 'Ajuntament de Novelda', type: 'rss' },
  { name: 'Xativa', display: 'Xàtiva', url: 'https://www.xativa.es/es/noticias', label: 'Ajuntament de Xàtiva', type: 'html' }
];

const HTML_MONTHS = {
  gener:'01', febrer:'02', març:'03', abril:'04', maig:'05', juny:'06',
  juliol:'07', agost:'08', setembre:'09', octubre:'10', novembre:'11', desembre:'12',
  enero:'01', febrero:'02', marzo:'03', abril:'04', mayo:'05', junio:'06',
  julio:'07', agosto:'08', septiembre:'09', octubre:'10', noviembre:'11', diciembre:'12'
};

async function fetchHtmlSource(source) {
  console.error(`fetchHtmlSource: ${source.name} (length ${source.name.length}, codes ${[...source.name].map(c => c.charCodeAt(0)).join(',')})`);
  const res = await fetch(source.url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; ValenciaFiles/1.0; +https://github.com/mrl666/valencia-files)',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'ca-ES,es;q=0.9,en;q=0.8'
    },
    redirect: 'follow'
  });
  if (!res.ok) throw new Error(`${source.name} HTTP ${res.status}`);
  const html = await res.text();

  const items = [];
  const seen = new Set();

  // --- Sagunt pattern: <h3 class="h5"><a href="/va/actualitat/...">TITLE</a></h3> ... <div class="box__meta">DD de mes YYYY</div>
  if (source.name === 'Sagunt') {
    const re = /<h3[^>]*class="h5"[^>]*>\s*<a[^>]+href="(\/[^"]*\/actualitat\/[^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/h3>[\s\S]{0,500}?<div[^>]*class="box__meta"[^>]*>\s*(\d{1,2})\s+de\s+([a-zàéíóúç]+)\s+(\d{4})/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
      const url = m[1];
      if (seen.has(url)) continue;
      const title = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      if (!title || title.length < 12) continue;
      const day = String(m[3]).padStart(2, '0');
      const month = HTML_MONTHS[m[4].toLowerCase()];
      const year = m[5];
      if (!month) continue;
      const date = `${year}-${month}-${day}`;
      const id = `${source.name.toLowerCase()}-${url.split('/').filter(Boolean).pop()}`;
      seen.add(url);
      items.push({ id, title, url: 'https://aytosagunto.es' + url, date, town: source.name, sourceLabel: source.label });
    }
  }

 if (source.name === 'Xàtiva' || source.name === 'Xativa') {
  console.error('Xativa branch entered, HTML length:', html.length);

  // Count candidate links and dates in the HTML
  const allLinks = [...html.matchAll(/href="([^"]*\/noticia\/[^"]+)"/g)];
  console.error('  links matching /noticia/ :', allLinks.length);
  if (allLinks.length > 0) console.error('  first link:', allLinks[0][1]);

  const allDates = [...html.matchAll(/datetime="(\d{4}-\d{2}-\d{2})/g)];
  console.error('  dates matching datetime= :', allDates.length);
  if (allDates.length > 0) console.error('  first date:', allDates[0][1]);

  // Full pattern — same as before but with wider window
  const linkRe = /<a[^>]+href="(\/[^"]*\/noticia\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  let m;
  let candidates = 0;
  while ((m = linkRe.exec(html)) !== null) {
    const url = m[1];
    if (seen.has(url)) continue;
    candidates++;

    const title = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (!title || title.length < 12) {
      console.error('  skipped (short title):', JSON.stringify(title.slice(0, 40)));
      continue;
    }

    const start = Math.max(0, m.index - 1500);
    const before = html.slice(start, m.index);
    const dateMatches = [...before.matchAll(/datetime="(\d{4}-\d{2}-\d{2})/g)];
    const date = dateMatches.length ? dateMatches[dateMatches.length - 1][1] : '';

    const id = `xativa-${url.split('/').filter(Boolean).pop()}`;
    seen.add(url);
    items.push({
      id,
      title,
      url: 'https://www.xativa.es' + url,
      date,
      town: 'Xàtiva',
      sourceLabel: source.label
    });
  }
  console.error('  candidates processed:', candidates);
  console.error('  → Xativa: ' + items.length + ' total items (incl. from other sources)');
}
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
      const items = source.type === 'html'
        ? await fetchHtmlSource(source)
        : await fetchFeed(source);
      all.push(...items);
    } catch (e) {
      console.error(`Skipping ${source.name}: ${e.message}`);
    }
  }

  all.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const pool = all.slice(0, 40);

  console.error(`region.js extracted ${pool.length} items total`);
  console.log(JSON.stringify(pool));
}

run()
  .then(() => console.error('region.js finished OK'))
  .catch(err => {
    console.error('Region scrape error:', err.message);
    process.exit(1);
  });
