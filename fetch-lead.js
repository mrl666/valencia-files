// Lead + image fetcher for Valencia Files.
// - Lead: Generalitat Valenciana (comunica.gva.es)
// - Image: Pixabay (rotating Valencia-related photos)
// Output: JSON on stdout (single object with title, url, optional image)

const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY;

const GVA_URL = 'https://comunica.gva.es/es/totes';
const PIXABAY_KEYWORDS = 'valencia spain';

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

// --- Pixabay: fetch a rotating Valencia image ---
async function fetchImage() {
  if (!PIXABAY_API_KEY) {
    console.error('  Pixabay: no API key, skipping');
    return null;
  }

  // Rotate keywords every 8 hours (aligned with the pipeline)
  const KEYWORD_SETS = [
    'valencia ciudad artes',
    'valencia fallas',
    'valencia puerto',
    'valencia centro historico',
    'valencia playa malvarrosa',
    'valencia catedral',
    'valencia turia rio',
    'valencia mercado central'
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

    if (hits.length === 0) return null;

    const idx = minutesSinceEpoch % hits.length;
    const img = hits[idx];

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
// --- GVA: fetch the top headline ---
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

    // Match links that look like news detail pages
    const linkRe = /<a[^>]+href="([^"]*(?:detalle|noticia)[^"]*)"[^>]*>([\s\S]*?)<\/a>/g;
    let match;
    let candidate = null;
    while ((match = linkRe.exec(html)) !== null) {
      const link = match[1];
      const title = match[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      if (title.length < 15) continue;
      candidate = {
        title,
        url: link.startsWith('http') ? link : 'https://comunica.gva.es' + link
      };
      break;
    }

    if (!candidate) {
      console.error('  GVA: no news link matched');
      return null;
    }

    console.error(`  GVA: lead = "${candidate.title.slice(0, 80)}"`);
    return candidate;
  } catch (e) {
    console.error(`  GVA: failed — ${e.message}`);
    return null;
  }
}

// --- Main ---
async function run() {
  console.error('fetch-lead.js starting…');

  const lead = await fetchGvaLead();
  const image = await fetchImage();

  if (!lead) {
    console.error('fetch-lead.js: no lead available — writing {}');
    console.log('{}');
    return;
  }

  if (image) lead.image = image;

  console.error('fetch-lead.js finished OK');
  console.log(JSON.stringify(lead));
}

run().catch(err => {
  console.error('Lead fetch error:', err.message);
  console.log('{}');
  process.exit(0); // never fail the pipeline over a missing lead
});
