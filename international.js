// International View — official EU/UN/CoE sources that mention Valencia.
// Sources (all official public-sector websites, reusable under Law 37/2007):
//   - UNRIC (UN Regional Information Centre, Spanish)
//   - European Commission — Spain Representation
//   - Council of Europe
//   - EU Digital Strategy
//   - EEAS (European External Action Service)
//
// Output: international.json — array of 0 or 1 items.
// If no source mentions Valencia, the array is empty and the section hides.

const SOURCES = [
  {
    name: 'UNRIC',
    url: 'https://unric.org/es/',
    label: 'UNRIC — Naciones Unidas',
    // match any of these terms in title or summary
    terms: ['valencia', 'valenciana', 'comunitat valenciana', 'dana']
  },
  {
    name: 'European Commission',
    url: 'https://spain.representation.ec.europa.eu/noticias-eventos/noticias-0_es',
    label: 'Comisión Europea — Representación en España',
    terms: ['valencia', 'valenciana', 'comunitat valenciana', 'dana']
  },
  {
    name: 'Council of Europe',
    url: 'https://www.coe.int/en/web/cultural-routes/news-2026',
    label: 'Council of Europe — Cultural Routes',
    terms: ['valencia', 'valencian', 'valenciana']
  },
  {
    name: 'EEAS',
    url: 'https://www.eeas.europa.eu/eeas/news_en',
    label: 'European External Action Service',
    terms: ['valencia', 'valencian', 'marines', 'bétera']
  },
  {
    name: 'EU Digital Strategy',
    url: 'https://digital-strategy.ec.europa.eu/en/news',
    label: 'European Commission — Digital Strategy',
    terms: ['valencia', 'valencian']
  }
];

// Fetch with a browser-like User-Agent
async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; ValenciaFiles/1.0; +https://github.com/mrl666/valencia-files)',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
    },
    redirect: 'follow'
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// Extract candidate news links with their titles from any HTML page.
// Works for most newsroom layouts (Drupal, WordPress, generic CMS).
function extractLinks(html, baseUrl) {
  const out = [];
  const seen = new Set();

  // Match anchor tags with reasonably long text content
  const re = /<a[^>]+href="([^"#]+)"[^>]*>([\s\S]*?)<\/a>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    let href = m[1].trim();
    let title = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

    if (!title || title.length < 20 || title.length > 200) continue;

    // Skip anchors that are obviously navigation
    if (/^(home|inicio|menu|contacto|buscar|search|log in|sign in|about)/i.test(title)) continue;

    // Normalise relative URLs
    if (href.startsWith('/')) {
      try {
        const u = new URL(baseUrl);
        href = u.origin + href;
      } catch (e) { continue; }
    } else if (!href.startsWith('http')) {
      continue;
    }

    if (seen.has(href)) continue;
    seen.add(href);
    out.push({ url: href, title });
  }

  return out;
}

// Try to find a date near the link
function findDateNear(html, linkUrl) {
  const idx = html.indexOf(linkUrl);
  if (idx < 0) return '';
  const window = html.slice(Math.max(0, idx - 800), idx + 800);

  // ISO date
  const iso = window.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  // DD/MM/YYYY
  const dmy = window.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;

  // Month name in Spanish/English/Catalan
  const months = {
    january:'01', february:'02', march:'03', april:'04', may:'05', june:'06',
    july:'07', august:'08', september:'09', october:'10', november:'11', december:'12',
    enero:'01', febrero:'02', marzo:'03', abril:'04', mayo:'05', junio:'06',
    julio:'07', agosto:'08', septiembre:'09', octubre:'10', noviembre:'11', diciembre:'12',
    gener:'01', febrer:'02', 'març':'03', abril:'04', maig:'05', juny:'06',
    juliol:'07', agost:'08', setembre:'09', octubre:'10', novembre:'11', desembre:'12'
  };
  const mn = window.match(/(\d{1,2})\s+(?:de\s+)?([a-zA-Zàéíóúç]+)\s+(?:de\s+)?(\d{4})/i);
  if (mn) {
    const mo = months[mn[2].toLowerCase()];
    if (mo) return `${mn[3]}-${mo}-${mn[1].padStart(2, '0')}`;
  }
  return '';
}

async function scrapeSource(source) {
  const html = await fetchHtml(source.url);
  const links = extractLinks(html, source.url);

  const hits = [];
  for (const link of links) {
    const haystack = link.title.toLowerCase();
    const matches = source.terms.some(t => haystack.includes(t));
    if (!matches) continue;

    // Skip obvious navigation and category pages
    if (/\/category\/|\/tag\/|\/author\//.test(link.url)) continue;

    const date = findDateNear(html, link.url);
    hits.push({
      id: `${source.name.toLowerCase().replace(/\s+/g, '-')}-${link.url.split('/').filter(Boolean).pop()}`,
      title: link.title,
      url: link.url,
      date,
      sourceLabel: source.label,
      sourceName: source.name
    });
  }

  console.error(`  ${source.name}: ${hits.length} matching items`);
  return hits;
}

async function run() {
  console.error('international.js starting…');

  const all = [];
  for (const source of SOURCES) {
    try {
      const hits = await scrapeSource(source);
      all.push(...hits);
    } catch (e) {
      console.error(`  ${source.name}: skipped — ${e.message}`);
    }
  }

  // Sort by date desc, pick only the newest
  all.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const pick = all.slice(0, 1);

  console.error(`international.js extracted ${pick.length} item(s)`);
  console.log(JSON.stringify(pick));
}

run()
  .then(() => console.error('international.js finished OK'))
  .catch(err => {
    console.error('International scrape error:', err.message);
    process.exit(1);
  });
