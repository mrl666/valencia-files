// Region scraper — combines multiple town RSS feeds and HTML news pages into one pool.
// Sources (all official council websites, reusable under Law 37/2007):
//   - Aspe, Torrent, Alzira, Novelda (RSS)
//   - Sagunt, Xàtiva, Vinaròs, Benicarló, Peníscola (HTML)
//   - IVACE (merged from ivace.json)

const fs = require('fs');

const SOURCES = [
  { name: 'Aspe',      url: 'https://aspe.es/feed/',                 label: 'Ayuntamiento de Aspe',   type: 'rss'  },
  { name: 'Torrent',   url: 'https://www.torrent.es/feed/',          label: 'Ajuntament de Torrent',  type: 'rss'  },
  { name: 'Alzira',    url: 'https://www.alzira.es/feed/',           label: 'Ajuntament d\'Alzira',   type: 'rss'  },
  { name: 'Novelda',   url: 'https://www.novelda.es/feed/',          label: 'Ajuntament de Novelda',  type: 'rss'  },
  { name: 'Sagunt',    url: 'https://aytosagunto.es/va/actualitat/', label: 'Ajuntament de Sagunt',   type: 'html' },
  { name: 'Xativa',    url: 'https://www.xativa.es/es/noticias',     label: 'Ajuntament de Xàtiva',   type: 'html' },
  { name: 'Vinaros',   url: 'https://vinaros.es/ca/noticies?page=1', label: 'Ajuntament de Vinaròs',  type: 'html' },
  { name: 'Benicarlo', url: 'https://www.ajuntamentdebenicarlo.org/act/pact-notesdepremsa.php', label: 'Ajuntament de Benicarló', type: 'html' },
  { name: 'Peniscola', url: 'https://www.peniscola.org/ver/3/?&pagina_actual=1', label: 'Ajuntament de Peníscola', type: 'html' }
];

const HTML_MONTHS = {
  gener:'01', febrer:'02', març:'03', abril:'04', maig:'05', juny:'06',
  juliol:'07', agost:'08', setembre:'09', octubre:'10', novembre:'11', desembre:'12',
  enero:'01', febrero:'02', marzo:'03', abril:'04', mayo:'05', junio:'06',
  julio:'07', agosto:'08', septiembre:'09', octubre:'10', noviembre:'11', diciembre:'12'
};

function cleanTitle(raw) {
  return String(raw || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&#8217;/g, '’')
    .replace(/&#8211;/g, '–')
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function isSuspicious(title) {
  if (!title) return true;
  if (title.length < 12) return true;
  if (title.length > 220) return true;
  
  // Reject titles with multiple dates (concatenation errors)
  const dates = title.match(/\d{1,2}\s+(?:de\s+)?[a-zA-Z]+\s+\d{4}/g);
  if (dates && dates.length > 1) return true;

  // NEW: Reject administrative, legal, or confidential noise
  const badWords = [
    'confidencial', 'protegido', 'protected', 'subasta', 'contrato', 'licitación', 
    'edicto', 'exposición pública', 'padrón', 'bases de la convocatoria',
    'ayudas', 'subvención', 'pleno', 'ordenanza', 'aprobación definitiva',
    'proyecto', 'proy_' // Blocks internal project codes
  ];
  
  const lowerTitle = title.toLowerCase();
  if (badWords.some(word => lowerTitle.includes(word))) {
    return true;
  }

  return false;
}

async function fetchHtmlSource(source) {
  console.error(`fetchHtmlSource: ${source.name}`);
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

  // --- Sagunt ---
  if (source.name === 'Sagunt') {
    const re = /<h3[^>]*class="h5"[^>]*>\s*<a[^>]+href="(\/[^"]*\/actualitat\/[^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/h3>[\s\S]{0,500}?<div[^>]*class="box__meta"[^>]*>\s*(\d{1,2})\s+de\s+([a-zàéíóúç]+)\s+(\d{4})/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
      const url = m[1];
      if (seen.has(url)) continue;
      const title = cleanTitle(m[2]);
      if (isSuspicious(title)) continue;
      const day = String(m[3]).padStart(2, '0');
      const month = HTML_MONTHS[m[4].toLowerCase()];
      const year = m[5];
      if (!month) continue;
      const date = `${year}-${month}-${day}`;
      const id = `sagunt-${url.split('/').filter(Boolean).pop()}`;
      seen.add(url);
      items.push({ id, title, url: 'https://aytosagunto.es' + url, date, town: 'Sagunt', sourceLabel: source.label });
    }
  }

  // --- Xàtiva ---
  if (source.name === 'Xativa') {
    const linkRe = /<a[^>]+href="(\/[^"]*\/noticia\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
    let m;
    while ((m = linkRe.exec(html)) !== null) {
      const url = m[1];
      if (seen.has(url)) continue;
      const title = cleanTitle(m[2]);
      if (isSuspicious(title)) continue;
      const start = Math.max(0, m.index - 1500);
      const before = html.slice(start, m.index);
      const dateMatches = [...before.matchAll(/datetime="(\d{4}-\d{2}-\d{2})/g)];
      const date = dateMatches.length ? dateMatches[dateMatches.length - 1][1] : '';
      const id = `xativa-${url.split('/').filter(Boolean).pop()}`;
      seen.add(url);
      items.push({ id, title, url: 'https://www.xativa.es' + url, date, town: 'Xàtiva', sourceLabel: source.label });
    }
  }

  // --- Vinaròs ---
  if (source.name === 'Vinaros') {
    const re = /(\d{2})\/(\d{2})\/(\d{4})[\s\S]{0,300}?<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
    let m;
    while ((m = re.exec(html)) !== null) {
      const url = m[4];
      if (seen.has(url)) continue;
      const title = cleanTitle(m[5]);
      if (isSuspicious(title)) continue;
      const date = `${m[3]}-${m[2]}-${m[1]}`;
      const id = `vinaros-${url.split('/').filter(Boolean).pop() || url}`;
      seen.add(url);
      items.push({ id, title, url: url.startsWith('http') ? url : 'https://vinaros.es' + url, date, town: 'Vinaròs', sourceLabel: source.label });
    }
  }

  // --- Benicarló ---
  if (source.name === 'Benicarlo') {
    const re = /<h2[^>]*>([\s\S]*?)<\/h2>[\s\S]{0,1000}?(\d{2})\/(\d{2})\/(\d{4})/g;
    let m;
    while ((m = re.exec(html)) !== null) {
      const title = cleanTitle(m[1]);
      if (isSuspicious(title)) continue;
      const date = `${m[4]}-${m[3]}-${m[2]}`;
      const id = `benicarlo-${title.slice(0, 30).replace(/\s+/g, '-').toLowerCase()}`;
      items.push({ id, title, url: source.url, date, town: 'Benicarló', sourceLabel: source.label });
    }
  }

  // --- Peñíscola ---
  if (source.name === 'Peniscola') {
    const re = /<h3[^>]*>([\s\S]*?)<\/h3>[\s\S]{0,1000}?(\d{2})\/(\d{2})\/(\d{4})/g;
    let m;
    while ((m = re.exec(html)) !== null) {
      const title = cleanTitle(m[1]);
      if (isSuspicious(title)) continue;
      const date = `${m[4]}-${m[3]}-${m[2]}`;
      const id = `peniscola-${title.slice(0, 30).replace(/\s+/g, '-').toLowerCase()}`;
      items.push({ id, title, url: source.url, date, town: 'Peníscola', sourceLabel: source.label });
    }
  }

  console.error(`  ${source.name}: ${items.length} items`);
  return items;
}

async function fetchFeed(source) {
  const res = await fetch(source.url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ValenciaFiles/1.0; +https://github.com/mrl666/valencia-files)', 'Accept': 'application/rss+xml, application/xml, text/xml, */*' },
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
    const title = cleanTitle(titleMatch[1]);
    if (!title || title.length < 10) continue;
    const url = linkMatch[1].trim();
    if (seen.has(url)) continue;
    let date = '';
    if (dateMatch) {
      const d = new Date(dateMatch[1]);
      if (!isNaN(d)) date = d.toISOString().slice(0, 10);
    }
    const id = `${source.name.toLowerCase()}-${url.split('/').filter(Boolean).pop() || url}`;
    seen.add(url);
    items.push({ id, title, url, date, town: source.name, sourceLabel: source.label });
  }
  console.error(`  ${source.name}: ${items.length} items`);
  return items;
}

async function run() {
  console.error('region.js starting…');
  const all = [];
  for (const source of SOURCES) {
    try {
      const items = source.type === 'html' ? await fetchHtmlSource(source) : await fetchFeed(source);
      all.push(...items);
    } catch (e) {
      console.error(`Skipping ${source.name}: ${e.message}`);
    }
  }

  // Merge IVACE items
  try {
    const ivace = JSON.parse(fs.readFileSync('ivace.json', 'utf8'));
    if (Array.isArray(ivace)) {
      all.push(...ivace);
      console.error(`  IVACE: ${ivace.length} items merged`);
    }
  } catch (e) {
    console.error('  IVACE: no ivace.json found');
  }

  const cleaned = all.filter(item => {
    if (!item.title) return false;
    if (item.title.length > 250) return false;
    const dates = item.title.match(/\d{1,2}\s+(?:de\s+)?[a-zA-Z]+\s+\d{4}/g);
    if (dates && dates.length > 1) return false;
    return true;
  });

  cleaned.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const pool = cleaned.slice(0, 90);

  console.error(`region.js extracted ${pool.length} items total`);
  console.log(JSON.stringify(pool));
}

run().then(() => console.error('region.js finished OK')).catch(err => {
  console.error('Region scrape error:', err.message);
  process.exit(1);
});
