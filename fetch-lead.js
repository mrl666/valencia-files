// Lead + image fetcher for Valencia Files.
//
// Priority chain for the lead:
//   1. GVA (comunica.gva.es) — preferred source, but often blocked from GitHub Actions
//   2. valencia.json — top story from Ajuntament de València (already scraped/translated)
//   3. Previous lead.json — keep the last good lead rather than blank it
//   4. {} — page keeps the last lead visible in index.html
//
// The Pixabay image always attaches to whichever lead wins.

const fs = require('fs');

const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY;

const GVA_URL = 'https://comunica.gva.es/es/totes';
const UA = 'Mozilla/5.0 (compatible; ValenciaFiles/1.0; +https://github.com/mrl666/valencia-files)';

async function testFetch(label, url, options = {}) {
  try {
    const res = await fetch(url, options);
    console.error(`  ${label}: HTTP ${res.status}`);
    return res;
  } catch (e) {
    console.error(`  ${label}: FETCH FAILED — ${e.message}`);
    throw e;
  }
}

// --- Pixabay: rotating Valencia image ---
async function fetchImage() {
  if (!PIXABAY_API_KEY) {
    console.error('  Pixabay: no API key, skipping');
    return null;
  }

  // Landmark-specific keywords — these won't match generic "valencia" content
  const KEYWORD_SETS = [
    'ciudad de las artes valencia',
    'valencia fallas',
    'valencia cathedral',
    'valencia malvarrosa beach',
    'valencia turia river',
    'valencia central market',
    'valencia old town',
    'valencia paella'
  ];

  // Reject anything whose tags or user contain these terms
  const BLACKLIST = [
    'renfe', 'train', 'tren', 'station', 'estacion', 'estación',
    'venezuela', 'carabobo', 'valencia venezuela',
    'airport', 'aeropuerto', 'plane', 'avion', 'avión',
    'metro', 'subway', 'bus', 'autobus', 'autobús'
  ];

  const now = new Date();
  const minutesSinceEpoch = Math.floor(now.getTime() / 60000);
  const hoursSinceEpoch = Math.floor(now.getTime() / 3600000);

  const keywords = KEYWORD_SETS[hoursSinceEpoch % KEYWORD_SETS.length];
  const page = (minutesSinceEpoch % 20) + 1;

  const url = `https://pixabay.com/api/?key=${PIXABAY_API_KEY}` +
              `&q=${encodeURIComponent(keywords)}` +
              `&image_type=photo&orientation=horizontal&per_page=20` +
              `&safesearch=true&page=${page}`;

  try {
    const res = await testFetch('Pixabay', url);
    if (!res.ok) return null;

    const data = await res.json();
    const hits = Array.isArray(data.hits) ? data.hits : [];
    console.error(`  Pixabay: "${keywords}" page ${page}, ${hits.length} hits`);

    // Filter out blacklisted images
    const filtered = hits.filter(img => {
      const haystack = [
        img.tags || '',
        img.user || '',
        img.pageURL || ''
      ].join(' ').toLowerCase();

      return !BLACKLIST.some(term => haystack.includes(term));
    });

    console.error(`  Pixabay: ${filtered.length} hits after blacklist`);

    if (filtered.length === 0) return null;

    const idx = minutesSinceEpoch % filtered.length;
    const img = filtered[idx];

    return {
      url: img.webformatURL,
      credit: `Photo by ${img.user} on Pixabay`,
      sourceUrl: img.pageURL
    };
  } catch (e) {
    console.error(`  Pixabay: skipped — ${e.message}`);
    return null;
  }
}

// --- GVA: top headline ---
async function fetchGvaLead() {
  try {
    const res = await testFetch('GVA', GVA_URL, {
      headers: {
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'es-ES,es;q=0.9'
      },
      redirect: 'follow'
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const html = await res.text();
    console.error(`  GVA: ${html.length} bytes of HTML`);

    const linkRe = /<a[^>]+href="([^"]*(?:detalle|noticia)[^"]*)"[^>]*>([\s\S]*?)<\/a>/g;
    let match;
    while ((match = linkRe.exec(html)) !== null) {
      const link = match[1];
      const title = match[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      if (title.length < 15) continue;
      const lead = {
        title,
        url: link.startsWith('http') ? link : 'https://comunica.gva.es' + link,
        source: 'Generalitat Valenciana'
      };
      console.error(`  GVA: lead = "${lead.title.slice(0, 80)}"`);
      return lead;
    }

    console.error('  GVA: no news link matched');
    return null;
  } catch (e) {
    console.error(`  GVA: failed — ${e.message}`);
    return null;
  }
}

// --- Fallback: top story from valencia.json ---
function fetchFallbackLead() {
  try {
    const valencia = JSON.parse(fs.readFileSync('valencia.json', 'utf8'));
    if (Array.isArray(valencia) && valencia[0] && valencia[0].title) {
      const lead = {
        title: valencia[0].title,
        url: valencia[0].url,
        source: 'Ajuntament de València'
      };
      console.error(`  Fallback lead from valencia.json: "${lead.title.slice(0, 80)}"`);
      return lead;
    }
  } catch (e) {
    console.error(`  Fallback from valencia.json failed: ${e.message}`);
  }
  return null;
}

// --- Fallback: previous lead.json ---
function fetchPreviousLead() {
  try {
    const previous = JSON.parse(fs.readFileSync('lead.json', 'utf8'));
    if (previous && previous.title) {
      console.error(`  Reusing previous lead: "${previous.title.slice(0, 80)}"`);
      return previous;
    }
  } catch (e) {
    // No previous lead
  }
  return null;
}

async function run() {
  console.error('fetch-lead.js starting…');

  // 1. Try GVA first
  let lead = await fetchGvaLead();

  // 2. Fall back to valencia.json
  if (!lead) {
    lead = fetchFallbackLead();
  }

  // 3. Fall back to the previous lead.json
  if (!lead) {
    lead = fetchPreviousLead();
  }

  // 4. Fetch a fresh Pixabay image regardless
  const image = await fetchImage();

  if (!lead) {
    console.error('fetch-lead.js: no lead available from any source — writing {}');
    console.log('{}');
    return;
  }

  if (image) {
    lead.image = image;
    console.error(`  Image attached: ${image.url.slice(0, 60)}…`);
  }

  console.error(`fetch-lead.js finished OK (source: ${lead.source || 'unknown'})`);
  console.log(JSON.stringify(lead));
}

run().catch(err => {
  console.error('Lead fetch error:', err.message);
  console.log('{}');
  process.exit(0); // never fail the pipeline over a missing lead
});
