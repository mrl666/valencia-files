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
const LEAD_IMAGES = [
  {
    file: '1.jpg',
    credit: 'Photo by papagnoc on Pixabay',
    sourceUrl: 'https://pixabay.com/photos/valencia-spain-calatrava-sunset-1049389/'
  },
  {
    file: '2.jpg',
    credit: 'Photo by [author] on Pixabay',
    sourceUrl: 'https://pixabay.com/photos/architecture-modern-symmetry-10265145/'
  },
  {
    file: '3.jpg',
    credit: 'Photo by [author] on Pixabay',
    sourceUrl: 'https://pixabay.com/photos/architecture-modern-clouds-science-10265095/'
  },
  {
    file: '4.jpg',
    credit: 'Photo by [author] on Pixabay',
    sourceUrl: 'https://pixabay.com/photos/building-queen-sofia-palace-of-arts-7300734/'
  },
  {
    file: '5.jpg',
    credit: 'Photo by [author] on Pixabay',
    sourceUrl: 'https://pixabay.com/photos/valencia-spain-architecture-4595268/'
  }
];

function fetchImage() {
  if (LEAD_IMAGES.length === 0) return null;

  // Rotate by hour — each edition gets the next image in the list
  const hoursSinceEpoch = Math.floor(Date.now() / 3600000);
  const pick = LEAD_IMAGES[hoursSinceEpoch % LEAD_IMAGES.length];

  return {
    url: `https://mrl666.github.io/valencia-files/images/lead/${pick.file}`,
    credit: pick.credit,
    sourceUrl: pick.sourceUrl
  };
}

// --- GVA: top headline ---
// --- GVA: top headline (via ScrapingAnt proxy) ---
async function fetchGvaLead() {
  const SCRAPINGANT_API_KEY = process.env.SCRAPINGANT_API_KEY;

  if (!SCRAPINGANT_API_KEY) {
    console.error('  GVA: no SCRAPINGANT_API_KEY, skipping');
    return null;
  }

  try {
    const params = new URLSearchParams({
      url: GVA_URL,
      browser: 'true',
      timeout: '60'
    });

    const res = await testFetch('GVA via ScrapingAnt', 
      `https://api.scrapingant.com/v2/general?${params}`, 
      { headers: { 'x-api-key': SCRAPINGANT_API_KEY } }
    );

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} — ${body.slice(0, 200)}`);
    }

    const html = await res.text();
    console.error(`  GVA: ${html.length} bytes of rendered HTML`);

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

    console.error('  GVA: no news link matched in rendered HTML');
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
