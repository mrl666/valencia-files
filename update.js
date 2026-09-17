const fs = require('fs');

const file = 'index.html';
let html = fs.readFileSync(file, 'utf8');

// --- Load weather if available (produced by: node weather.js > weather.json) ---
let weather = null;
try {
  weather = JSON.parse(fs.readFileSync('weather.json', 'utf8'));
  if (!weather || !weather.current || !weather.forecast) weather = null;
} catch (e) {
  // no weather file — keep placeholder
}

// --- Load Valencia news if available ---
let valenciaNews = null;
try {
  valenciaNews = JSON.parse(fs.readFileSync('valencia.json', 'utf8'));
  if (!valenciaNews || !valenciaNews.length) valenciaNews = null;
} catch (e) {
  // no valencia news file — keep placeholder
}

// --- Rotating thought pool ---
const thoughts = [
  { t: "No wind is favourable for the sailor who does not know which port they are heading to.", a: "Seneca" },
  { t: "We suffer more often in imagination than in reality.", a: "Seneca" },
  { t: "The best way out is always through.", a: "Robert Frost" },
  { t: "Little by little, one travels far.", a: "J.R.R. Tolkien" },
  { t: "What you do every day matters more than what you do once in a while.", a: "Gretchen Rubin" }
];
const pick = thoughts[Math.floor(Date.now() / 3600000) % thoughts.length];

// --- Rotating headline pool (placeholder until real feeds land) ---
const headlines = [
  { h: "Valencia and the DGT agree to share traffic-camera data", s: "Two-sentence summary goes here in the next step." },
  { h: "Paiporta triples subsidies for school parents' associations", s: "The council has increased funding to more than €30,000." },
  { h: "More than three tonnes of waste removed from the Devesa-Albufera", s: "The city reports 3,100 kg of waste removed in the latest operation." },
  { h: "Valencia joins an Ibero-American network on sport and development", s: "The city joins an international municipal network on sustainable urban development." }
];
const lead = headlines[Math.floor(Date.now() / 21600000) % headlines.length];

const stamp = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';

// --- Inject thought ---
html = html.replace(
  /<p class="thought" id="thought">[\s\S]*?<\/p>/,
  `<p class="thought" id="thought">“${pick.t}”<span class="author" id="thought-author">— ${pick.a}</span></p>`
);

// --- Inject lead ---
html = html.replace(
  /<article class="lead">[\s\S]*?<\/article>/,
  `<article class="lead">
    <h2>${lead.h}</h2>
    <p>${lead.s}</p>
    <span class="src"><a href="https://www.valencia.es/" target="_blank" rel="noopener">Source: Ajuntament de València · ${stamp}</a></span>
  </article>`
);

// --- Inject weather (only if real data present) ---
if (weather) {
  const forecastHtml = weather.forecast.map(f =>
    `<div><span class="d">${f.day}</span><span class="t">${f.high}°</span></div>`
  ).join('');

  html = html.replace(
    /<div class="strip-card">\s*<div class="kicker">Valencia now<\/div>[\s\S]*?<!--\s*END-WEATHER\s*-->/,
    `<div class="strip-card">
      <div class="kicker">Valencia now</div>
      <div class="weather-now">
        <span class="temp">${weather.current.temp}°</span>
        <span class="desc">${weather.current.desc}</span>
      </div>
      <div class="weather-forecast">
        ${forecastHtml}
      </div>
      <div class="source-note">Source: <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a></div>
    </div><!-- END-WEATHER -->`
  );
}

// --- Inject edition stamp ---
html = html.replace(
  /<span id="edition">[^<]*<\/span>/,
  `<span id="edition">Updated ${stamp}</span>`
);

fs.writeFileSync(file, html);
console.log('Updated index.html at', stamp);
