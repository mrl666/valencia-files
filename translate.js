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
const region = loadJson('region.json') || [];
const international = loadJson('international.json') || [];
const admin = loadJson('admin.json') || [];

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
    if (!item) return;
    if (item.title) {
      item.title = decodeHtmlEntities(item.title);
      if (!cache[item.title]) toTranslate.add(item.title);
    }
    if (item.detail) {
      item.detail = decodeHtmlEntities(item.detail);
      if (!cache[item.detail]) toTranslate.add(item.detail);
    }
  });
}

if (lead && lead.title) {
  if (!cache[lead.title]) toTranslate.add(lead.title);
}
collect(valencia);
collect(alicante);
collect(castellon);
collect(region);
collect(international);
collect(admin);

const uniqueHeadlines = Array.from(toTranslate);

// --- Translate in one batch call ---
async function translateBatch(texts) {
  if (texts.length === 0) return {};
  const params = new URLSearchParams();
  const marked = texts.map(t => contextualize(t));
  marked.forEach(t => params.append('text', t));
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
    out[texts[i]] = decontextualize(t.text);
  });
  return out;
}

// --- Apply translations ---
function applyTranslation(item) {
  if (!item) return item;
  const out = { ...item };
  if (item.title && cache[item.title]) {
    out.title = cache[item.title];
    out.title_original = item.title;
  }
  if (item.detail && cache[item.detail]) {
    out.detail = cache[item.detail];
    out.detail_original = item.detail;
  }
  return out;
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
    castellon: castellon.map(applyTranslation),
    region: region.map(applyTranslation),
    international: international.map(applyTranslation),
    admin: admin.map(applyTranslation)
  };

  console.log(JSON.stringify(output));
}

function decodeHtmlEntities(s) {
  if (!s) return s;
  return String(s)
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&aacute;/g, 'á').replace(/&eacute;/g, 'é')
    .replace(/&iacute;/g, 'í').replace(/&oacute;/g, 'ó')
    .replace(/&uacute;/g, 'ú').replace(/&ntilde;/g, 'ñ')
    .replace(/&Aacute;/g, 'Á').replace(/&Eacute;/g, 'É')
    .replace(/&Iacute;/g, 'Í').replace(/&Oacute;/g, 'Ó')
    .replace(/&Uacute;/g, 'Ú').replace(/&Ntilde;/g, 'Ñ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&laquo;/g, '«').replace(/&raquo;/g, '»')
    .replace(/&hellip;/g, '…');
}

function contextualize(text) {
  return String(text)
    // Force "Generalitat" to be understood as Valencian
    .replace(/\bGeneralitat Valenciana\b/g, 'GVA_VALENCIANA')
    .replace(/\bGeneralitat\b/g, 'GVA_VALENCIANA');
}

function decontextualize(text) {
  return String(text)
    .replace(/GVA_VALENCIANA/g, 'Generalitat Valenciana')
    .replace(/Generalitat Valenciana Valenciana/g, 'Generalitat Valenciana');
}

run().catch(err => {
  console.error('Translation error:', err.message);
  process.exit(1);
});
