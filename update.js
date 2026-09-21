const fs = require('fs');

const file = 'index.html';
let html = fs.readFileSync(file, 'utf8');

// --- Load weather if available ---
let weather = null;
try {
  weather = JSON.parse(fs.readFileSync('weather.json', 'utf8'));
  if (!Array.isArray(weather) || weather.length !== 3) weather = null;
} catch (e) {
  weather = null;
}

// --- Load Valencia news if available ---
let valenciaNews = null;
try {
  valenciaNews = JSON.parse(fs.readFileSync('valencia.json', 'utf8'));
  if (!Array.isArray(valenciaNews) || !valenciaNews.length) valenciaNews = null;
} catch (e) {
  valenciaNews = null;
}

// --- Pick thought of the day (rotation) ---
let thought = null;
try {
  const quotes = JSON.parse(fs.readFileSync('quotes.json', 'utf8'));
  const used = JSON.parse(fs.readFileSync('used.json', 'utf8'));

  const now = Date.now();
  const COOLDOWN_DAYS = 60;
  const cooldownMs = COOLDOWN_DAYS * 24 * 3600 * 1000;

  const lastUsed = new Map();
  used.forEach(entry => {
    if (entry && entry.id) lastUsed.set(entry.id, entry.at || 0);
  });

  const fresh = quotes.filter(q => {
    const at = lastUsed.get(q.id) || 0;
    return (now - at) > cooldownMs;
  });

  const pool = fresh.length ? fresh : quotes.slice().sort((a, b) => {
    return (lastUsed.get(a.id) || 0) - (lastUsed.get(b.id) || 0);
  });

  const slot = Math.floor(now / 3600000) % pool.length;
  thought = pool[slot];

  const updatedUsed = used.filter(e => e.id !== thought.id);
  updatedUsed.push({ id: thought.id, at: now });
  fs.writeFileSync('used.json', JSON.stringify(updatedUsed, null, 2));
} catch (e) {
  console.error('Quote picker error:', e.message);
}

// --- Rotating lead pool (placeholder until real feeds land) ---
const headlines = [
  { h: "Valencia and the DGT agree to share traffic-camera data", s: "Two-sentence summary goes here in the next step." },
  { h: "Paiporta triples subsidies for school parents' associations", s: "The council has increased funding to more than €30,000." },
  { h: "More than three tonnes of waste removed from the Devesa-Albufera", s: "The city reports 3,100 kg of waste removed in the latest operation." },
  { h: "Valencia joins an Ibero-American network on sport and development", s: "The city joins an international municipal network on sustainable urban development." }
];
const lead = headlines[Math.floor(Date.now() / 21600000) % headlines.length];

const stamp = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';

// --- Helper: replace inner HTML of the first element with a given id ---
function replaceById(html, id, newInner) {
  // Matches an opening tag containing id="<id>" and captures the tag name,
  // then finds the matching closing tag for that tag name.
  const openRe = new RegExp(`<([a-zA-Z][a-zA-Z0-9]*)\\b[^>]*\\bid="${id}"[^>]*>`);
  const m = html.match(openRe);
  if (!m) return html;

  const tag = m[1];
  const openIdx = m.index;
  const openEnd = openIdx + m[0].length;

  // Walk forward to find the matching closing tag, respecting nesting of the same tag.
  let depth = 1;
  let i = openEnd;
  const tagRe = new RegExp(`<\\/?${tag}\\b[^>]*>`, 'g');
  tagRe.lastIndex = openEnd;

  let mm;
  while ((mm = tagRe.exec(html)) !== null) {
    if (mm[0].startsWith('</')) {
      depth--;
      if (depth === 0) {
        return html.slice(0, openEnd) + newInner + html.slice(mm.index);
      }
    } else if (!mm[0].endsWith('/>')) {
      depth++;
    }
    i = mm.index + mm[0].length;
  }
  return html; // no matching close found
}

// --- Inject thought ---
if (thought) {
  html = replaceById(
    html,
    'thought-block',
    `<div class="kicker">Thought of the day</div>
     <p class="thought" id="thought">“${thought.text}”<span class="author" id="thought-author">— ${thought.author}</span></p>`
  );
}

// --- Inject lead ---
html = replaceById(
  html,
  'lead-story',
  `<h2>${lead.h}</h2>
    <p>${lead.s}</p>
    <span class="src"><a href="https://www.valencia.es/" target="_blank" rel="noopener">Source: Ajuntament de València · ${stamp}</a></span>`
);

// --- Inject Valencia news ---
if (valenciaNews) {
  const newsHtml = valenciaNews.map(item =>
    `<li>
      <h3><a href="${item.url}" target="_blank" rel="noopener">${item.title}</a></h3>
      <span class="src">Source: Ajuntament de València · ${item.date}</span>
    </li>`
  ).join('');

  html = replaceById(html, 'valencia-stories', newsHtml);
}

// --- Inject weather (three cities) ---
if (weather) {
  const buildCity = (city) => {
    const forecastHtml = city.forecast.map(f =>
      `<div><span class="d">${f.day}</span><span class="t">${f.high}°</span></div>`
    ).join('');
    return `<div class="weather-city">
      <div class="city-name">${city.name}</div>
      <div class="weather-now">
        <span class="temp">${city.current.temp}°</span>
        <span class="desc">${city.current.desc}</span>
      </div>
      <div class="weather-forecast">${forecastHtml}</div>
    </div>`;
  };

  html = replaceById(
    html,
    'weather-card',
    `<div class="kicker">Weather · València · Alacant · Castelló</div>
      <div class="weather-cities">
        ${weather.map(buildCity).join('')}
      </div>
      <div class="source-note">Source: <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a></div>`
  );
}

// --- Inject edition stamp ---
html = html.replace(
  /<span id="edition">[^<]*<\/span>/,
  `<span id="edition">Updated ${stamp}</span>`
);

fs.writeFileSync(file, html);
console.log('Updated index.html at', stamp);
