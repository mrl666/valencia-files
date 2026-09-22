const fs = require('fs');

const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
if (!DEEPL_API_KEY) {
  console.error('Missing DEEPL_API_KEY');
  process.exit(1);
}

// --- Load sources ---
function loadJson(path) {
  try { return JSON.parse(fs.readFileSync(path, 'utf8')); }
  catch (e) { return null; }
}

const lead = loadJson('lead.json');
const valencia = loadJson('valencia.json') || [];
const alicante = loadJson('alicante.json') || [];
const castellon = loadJson('castellon.json') || [];

// --- Load translation cache ---
let cache = {};
try {
  cache = JSON.parse(fs.readFileSync('translations-cache.json', 'utf8'));
  if (typeof cache !== 'object' || Array.isArray(cache)) cache = {};
} catch (e) { cache = {}; }

// --- Collect all headlines needing translation ---
const toTranslate = new Set();

function collect(items) {
  if (!Array.isArray(items)) return;
  items.forEach(item => {
    if (item && item.title && !cache[item.title]) {
      toTranslate.add(item.title);
    }
  });
}

if (lead && lead.title) {
  if (!cache[lead.title]) toTranslate.add(lead.title);
}
collect(valencia);
collect(alicante);
collect(castellon);

const uniqueHeadlines = Array.from(toTranslate);

// --- Translate in one batch call ---
async function translateBatch(texts) {
  if (texts.length === 0) return {};
  const params = new URLSearchParams();
  texts.forEach(t => params.append('text', t));
  params.append('source_lang', 'ES');
  params.append('target_lang', 'EN-GB');

  const res = await fetch('https://api-free.deepl.com/v2/translate', {
    method: 'POST',
    headers: {
      'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`DeepL HTTP ${res.status} — ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const out = {};
  data.translations.forEach((t, i) => {
    out[texts[i]] = t.text;
  });
  return out;
}

// --- Apply translations ---
function applyTranslation(item) {
  if (!item || !item.title) return item;
  const translated = cache[item.title];
  if (translated) {
    return { ...item, title: translated, title_original: item.title };
  }
  return item;
}

async function run() {
  if (uniqueHeadlines.length > 0) {
    console.error(`Translating ${uniqueHeadlines.length} new headlines via DeepL…`);
    const fresh = await translateBatch(uniqueHeadlines);
    Object.assign(cache, fresh);
    fs.writeFileSync('translations-cache.json', JSON.stringify(cache, null, 2));
  } else {
    console.error('All headlines already cached.');
  }

  const output = {
    lead: lead ? applyTranslation(lead) : null,
    valencia: valencia.map(applyTranslation),
    alicante: alicante.map(applyTranslation),
    castellon: castellon.map(applyTranslation)
  };

  console.log(JSON.stringify(output));
}

run().catch(err => {
  console.error('Translation error:', err.message);
  process.exit(1);
});
