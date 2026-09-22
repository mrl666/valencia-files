const fs = require('fs');

const file = 'index.html';
let html = fs.readFileSync(file, 'utf8');

// --- Load everything from translated.json ---
// translated.json is produced by translate.js and contains:
//   { lead, valencia: [], alicante: [], castellon: [] }
let translated = { lead: null, valencia: [], alicante: [], castellon: [] };
try {
  const parsed = JSON.parse(fs.readFileSync('translated.json', 'utf8'));
  if (parsed && typeof parsed === 'object') {
    translated = {
      lead: parsed.lead || null,
      valencia: Array.isArray(parsed.valencia) ? parsed.valencia : [],
      alicante: Array.isArray(parsed.alicante) ? parsed.alicante : [],
      castellon: Array.isArray(parsed.castellon) ? parsed.castellon : []
    };
  }
} catch (e) {
  // translated.json missing or malformed — keep empty defaults
}

const leadNews      = translated.lead;
const valenciaPool  = translated.valencia;
const alicantePool  = translated.alicante;
const castellonPool = translated.castellon;

// --- Load weather ---
let weather = null;
try {
  weather = JSON.parse(fs.readFileSync('weather.json', 'utf8'));
  if (!Array.isArray(weather) || weather.length !== 3) weather = null;
} catch (e) { weather = null; }

// --- Load used-news ---
let usedNews = [];
try {
  usedNews = JSON.parse(fs.readFileSync('used-news.json', 'utf8'));
  if (!Array.isArray(usedNews)) usedNews = [];
} catch (e) { usedNews = []; }

// --- Load quotes + rotation ---
let thought = null;
try {
  const quotes = JSON.parse(fs.readFileSync('quotes.json', 'utf8'));
  const used = JSON.parse(fs.readFileSync('used.json', 'utf8'));
  const now = Date.now();
  const cooldownMs = 60 * 24 * 3600 * 1000;
  const lastUsed = new Map();
  used.forEach(e => { if (e && e.id) lastUsed.set(e.id, e.at || 0); });
  const fresh = quotes.filter(q => (now - (lastUsed.get(q.id) || 0)) > cooldownMs);
  const pool = fresh.length ? fresh : quotes.slice().sort((a, b) =>
    (lastUsed.get(a.id) || 0) - (lastUsed.get(b.id) || 0));
  const slot = Math.floor(now / 3600000) % pool.length;
  thought = pool[slot];
  const updated = used.filter(e => e.id !== thought.id);
  updated.push({ id: thought.id, at: now });
  fs.writeFileSync('used.json', JSON.stringify(updated, null, 2));
} catch (e) { console.error('Quote picker error:', e.message); }

// --- Helpers ---
function replaceById(html, id, newInner) {
  const openRe = new RegExp(`<([a-zA-Z][a-zA-Z0-9]*)\\b[^>]*\\bid="${id}"[^>]*>`);
  const m = html.match(openRe);
  if (!m) return html;
  const tag = m[1];
  const openEnd = m.index + m[0].length;
  let depth = 1;
  const tagRe = new RegExp(`<\\/?${tag}\\b[^>]*>`, 'g');
  tagRe.lastIndex = openEnd;
  let mm;
  while ((mm = tagRe.exec(html)) !== null) {
    if (mm[0].startsWith('</')) {
      depth--;
      if (depth === 0) {
        return html.slice(0, openEnd) + newInner + html.slice(mm.index);
      }
    } else if (!mm[0].endsWith('/>')) depth++;
  }
  return html;
}

function shuffle(arr, seed) {
  const a = arr.slice();
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const stamp = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
const seed = Math.floor(Date.now() / 3600000);

// --- Inject GVA Lead ---
if (leadNews && leadNews.title) {
  const imageHtml = leadNews.image
    ? `<img id="lead-image" src="${esc(leadNews.image.url)}" alt="" style="width:100%; height:200px; object-fit:cover; display:block; margin-bottom:6px; border:1px solid var(--rule);">
       <div class="image-credit" style="margin-bottom:12px;">${esc(leadNews.image.credit)} — <a href="${esc(leadNews.image.sourceUrl)}" target="_blank" rel="noopener">Source</a></div>`
    : '';

  html = replaceById(html, 'lead-story',
    `${imageHtml}
     <h2>${esc(leadNews.title)}</h2>
     <span class="src"><a href="${esc(leadNews.url)}" target="_blank" rel="noopener">Source: Generalitat Valenciana · ${stamp}</a></span>`
  );
}

// --- Inject Valencia secondary stories ---
if (valenciaPool.length >= 3) {
  const shuffled = shuffle(valenciaPool, seed);
  const secondary = shuffled.slice(0, 3);
  const secHtml = secondary.map(item =>
    `<li>
      <h3><a href="${esc(item.url)}" target="_blank" rel="noopener">${esc(item.title)}</a></h3>
      <span class="src">Source: Ajuntament de València · ${esc(item.date || '')}</span>
    </li>`
  ).join('');
  html = replaceById(html, 'valencia-stories', secHtml);

  usedNews = [{ id: secondary[0].id, at: Date.now() }];
  fs.writeFileSync('used-news.json', JSON.stringify(usedNews, null, 2));
}

// --- Inject Alicante stories ---
if (alicantePool.length >= 1) {
  const picks = shuffle(alicantePool, seed + 7).slice(0, 3);
  const htmlList = picks.map(item =>
    `<li>
      <h3><a href="${esc(item.url)}" target="_blank" rel="noopener">${esc(item.title)}</a></h3>
      <span class="src">Source: Ayuntamiento de Alicante · ${esc(item.date || '')}</span>
    </li>`
  ).join('');
  html = replaceById(html, 'alicante-stories', htmlList);
}

// --- Inject Castellón stories ---
if (castellonPool.length >= 1) {
  const picks = shuffle(castellonPool, seed + 13).slice(0, 3);
  const htmlList = picks.map(item =>
    `<li>
      <h3><a href="${esc(item.url)}" target="_blank" rel="noopener">${esc(item.title)}</a></h3>
      <span class="src">Source: Ajuntament de Castelló · ${esc(item.date || '')}</span>
    </li>`
  ).join('');
  html = replaceById(html, 'castellon-stories', htmlList);
}

// --- Inject thought ---
if (thought) {
  html = replaceById(html, 'thought-block',
    `<div class="kicker">Thought of the day</div>
     <p class="thought" id="thought">“${esc(thought.text)}”<span class="author" id="thought-author">— ${esc(thought.author)}</span></p>`
  );
}

// --- Inject weather ---
if (weather) {
  const buildCity = (city) => {
    const forecastHtml = city.forecast.map(f =>
      `<div><span class="d">${esc(f.day)}</span><span class="t">${f.high}°</span></div>`
    ).join('');
    return `<div class="weather-city">
      <div class="city-name">${esc(city.name)}</div>
      <div class="weather-now"><span class="temp">${city.current.temp}°</span><span class="desc">${esc(city.current.desc)}</span></div>
      <div class="weather-forecast">${forecastHtml}</div>
    </div>`;
  };
  html = replaceById(html, 'weather-card',
    `<div class="kicker">Weather · València · Alacant · Castelló</div>
     <div class="weather-cities">${weather.map(buildCity).join('')}</div>
     <div class="source-note">Source: <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a></div>`
  );
}

// --- Edition stamp ---
html = html.replace(/<span id="edition">[^<]*<\/span>/,
  `<span id="edition">Updated ${stamp}</span>`);

fs.writeFileSync(file, html);
console.log('Updated index.html at', stamp);
