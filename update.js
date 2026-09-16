const fs = require('fs');

const file = 'index.html';
let html = fs.readFileSync(file, 'utf8');

// --- 1. Rotating thought pool ---
const thoughts = [
  { t: "No wind is favourable for the sailor who does not know which port they are heading to.", a: "Seneca" },
  { t: "We suffer more often in imagination than in reality.", a: "Seneca" },
  { t: "The best way out is always through.", a: "Robert Frost" },
  { t: "Little by little, one travels far.", a: "J.R.R. Tolkien" },
  { t: "What you do every day matters more than what you do once in a while.", a: "Gretchen Rubin" }
];
const pick = thoughts[Math.floor(Date.now() / 3600000) % thoughts.length];

// --- 2. Rotating headline pool (placeholder until real feeds) ---
const headlines = [
  { h: "Valencia and the DGT agree to share traffic-camera data", s: "Two-sentence summary goes here in the next step." },
  { h: "Paiporta triples subsidies for school parents' associations", s: "The council has increased funding to more than €30,000." },
  { h: "More than three tonnes of waste removed from the Devesa-Albufera", s: "The city reports 3,100 kg of waste removed in the latest operation." },
  { h: "Valencia joins an Ibero-American network on sport and development", s: "The city joins an international municipal network on sustainable urban development." }
];
const lead = headlines[Math.floor(Date.now() / 21600000) % headlines.length];

// --- 3. Inject into the HTML ---
const stamp = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';

// Thought
html = html.replace(
  /<p class="thought" id="thought">[\s\S]*?<\/p>/,
  `<p class="thought" id="thought">“${pick.t}”<span class="author" id="thought-author">— ${pick.a}</span></p>`
);

// Lead headline + summary
html = html.replace(
  /<article class="lead">[\s\S]*?<\/article>/,
  `<article class="lead">
    <h2>${lead.h}</h2>
    <p>${lead.s}</p>
    <span class="src"><a href="https://www.valencia.es/" target="_blank" rel="noopener">Source: Ajuntament de València · ${stamp}</a></span>
  </article>`
);

// Edition stamp in masthead (visible proof it updated)
html = html.replace(
  /<span id="edition">[^<]*<\/span>/,
  `<span id="edition">Updated ${stamp}</span>`
);

fs.writeFileSync(file, html);
console.log('Updated index.html at', stamp);
