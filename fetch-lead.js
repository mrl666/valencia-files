// Lead + image fetcher for Valencia Files.
//
// Priority chain for the lead:
//   1. lead-manual.json — manual override (supports 1 or 2 leads)
//   2. GVA (comunica.gva.es) — preferred source, extracts top 2 headlines
//   3. valencia.json — top story from Ajuntament de València
//   4. Previous lead.json — keep the last good lead
//   5. {} — page keeps the last lead visible in index.html
//
// Image: rotates through 5 hand-picked Valencia photos stored in the repo.

const fs = require('fs');

const GVA_URL = 'https://comunica.gva.es/es/totes';
const UA = 'Mozilla/5.0 (compatible; ValenciaFiles/1.0; +https://github.com/mrl666/valencia-files)';

const LEAD_IMAGES = [
  {
    file: '1.jpg',
    credit: 'Photo by papagnoc on Pixabay',
    sourceUrl: 'https://pixabay.com/photos/valencia-spain-calatrava-sunset-1049389/'
  },
  {
    file: '2.jpg',
    credit: 'Photo by [ELG21] on Pixabay',
    sourceUrl: 'https://pixabay.com/photos/architecture-modern-symmetry-10265145/'
  },
  {
    file: '3.jpg',
    credit: 'Photo by ELG21 on Pixabay',
    sourceUrl: 'https://pixabay.com/photos/architecture-modern-clouds-science-10265095/'
  },
  {
    file: '4.jpg',
    credit: 'Photo by [AMDUMA] on Pixabay',
    sourceUrl: 'https://pixabay.com/photos/building-queen-sofia-palace-of-arts-7300734/'
  },
  {
    file: '5.jpg',
    credit: 'Photo by [AG-Pics] on Pixabay',
    sourceUrl: 'https://pixabay.com/photos/valencia-spain-architecture-4595268/'
  }
];

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

// --- Rotating image from the local repo ---
function fetchImage() {
  if (LEAD_IMAGES.length === 0) return null;

  const hoursSinceEpoch = Math.floor(Date.now() / 3600000);
  const pick = LEAD_IMAGES[hoursSinceEpoch % LEAD_IMAGES.length];

  return {
    url: `https://mrl666.github.io/valencia-files/images/lead/${pick.file}`,
    credit: pick.credit,
    sourceUrl: pick.sourceUrl
  };
}

// --- Manual override (supports 1 or 2 leads) ---
function fetchManualLead() {
  try {
    const manual = JSON.parse(fs.readFileSync('lead-manual.json', 'utf8'));
    if (manual && manual.title) {
      console.error(`  Using MANUAL lead: "${manual.title.slice(0, 80)}"`);
      if (manual.title2) {
        console.error(`  Using MANUAL lead 2: "${manual.title2.slice(0, 80)}"`);
      }
      return manual;
    }
  } catch (e) {
    // No manual lead
  }
  return null;
}

// --- GVA: top 2 headlines ---
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
    const found = [];

    while ((match = linkRe.exec(html)) !== null && found.length < 2) {
      const link = match[1];
      const title = match[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      if (title.length < 15) continue;

      found.push({
        title,
        url: link.startsWith('http') ? link : 'https://comunica.gva.es' + link,
        source: 'Generalitat Valenciana'
      });
    }

    if (found.length === 0) {
      console.error('  GVA: no news link matched');
      return null;
    }

    const lead = {
      title: found[0].title,
      url: found[0].url,
      source: found[0].source,
      title2: found[1] ? found[1].title : '',
      url2: found[1] ? found[1].url : '',
      source2: found[1] ? found[1].source : ''
    };

    console.error(`  GVA: lead 1 = "${lead.title.slice(0, 80)}"`);
    if (lead.title2) console.error(`  GVA: lead 2 = "${lead.title2.slice(0, 80)}"`);

    return lead;
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
      // If there is a second item, use it as lead 2
      if (valencia[1] && valencia[1].title) {
        lead.title2 = valencia[1].title;
        lead.url2 = valencia[1].url;
        lead.source2 = 'Ajuntament de València';
      }
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

  // 1. PRIORITY: Manual Lead
  let lead = fetchManualLead();

  // 2. GVA
  if (!lead) {
    lead = await fetchGvaLead();
  }

  // 3. valencia.json fallback
  if (!lead) {
    lead = fetchFallbackLead();
  }

  // 4. Previous lead.json
  if (!lead) {
    lead = fetchPreviousLead();
  }

  // 5. Fresh image from the local rotation
  const image = fetchImage();

  if (!lead) {
    console.error('fetch-lead.js: no lead available from any source — writing {}');
    console.log('{}');
    return;
  }

  if (image) {
    lead.image = image;
    console.error(`  Image attached: ${image.url}`);
  }

  console.error(`fetch-lead.js finished OK (source: ${lead.source || 'unknown'})`);
  console.log(JSON.stringify(lead));
}

run().catch(err => {
  console.error('Lead fetch error:', err.message);
  console.log('{}');
  process.exit(0);
});
