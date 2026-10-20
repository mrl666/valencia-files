// Castellón region scraper — combines news from Vinaròs, Benicarló, and Peñíscola.
// Sources (official council websites):
//   - Vinaròs:   https://vinaros.es/ca/noticies?page=1
//   - Benicarló: https://www.ajuntamentdebenicarlo.org/act/pact-notesdepremsa.php
//   - Peñíscola: https://www.peniscola.org/ver/3/?&pagina_actual=1

const SOURCES = [
  { name: 'Vinaros',   url: 'https://vinaros.es/ca/noticies?page=1', label: 'Ajuntament de Vinaròs', type: 'html' },
  { name: 'Benicarlo', url: 'https://www.ajuntamentdebenicarlo.org/act/pact-notesdepremsa.php', label: 'Ajuntament de Benicarló', type: 'html' },
  { name: 'Peniscola', url: 'https://www.peniscola.org/ver/3/?&pagina_actual=1', label: 'Ajuntament de Peníscola', type: 'html' }
];

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
  const dates = title.match(/\d{1,2}\s+(?:de\s+)?[a-zA-Z]+\s+\d{4}/g);
  if (dates && dates.length > 1) return true;
  return false;
}

async function fetchSource(source) {
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

  // --- Vinaròs: DD/MM/YYYY followed by headline ---
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

  // --- Benicarló: <h2>Title</h2> ... DD/MM/YYYY ---
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

  // --- Peñíscola: <h3>Title</h3> ... DD/MM/YYYY ---
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

async function run() {
  console.error('castellon.js starting…');
  const all = [];
  
  for (const source of SOURCES) {
    try {
      const items = await fetchSource(source);
      all.push(...items);
    } catch (e) {
      console.error(`Skipping ${source.name}: ${e.message}`);
    }
  }

  all.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const pool = all.slice(0, 15);

  console.error(`castellon.js extracted ${pool.length} items total`);
  console.log(JSON.stringify(pool));
}

run()
  .then(() => console.error('castellon.js finished OK'))
  .catch(err => {
    console.error('Castellón scrape error:', err.message);
    console.log('[]');
    process.exit(0);
  });
