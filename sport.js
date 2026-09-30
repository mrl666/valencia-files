// Sport scraper — openfootball/football.json (public domain, no API key)
// Datasets:
//   es.1 2026-27 — La Liga (Valencia, Villarreal, Levante)
//   es.2 2025-26 — Segunda División (Castellón, last available season)

const BASE = 'https://raw.githubusercontent.com/openfootball/football.json/master';

const TEAMS = [
  { id: 'valencia',   name: 'Valencia CF',   dataset: 'es.1', season: '2026-27' },
  { id: 'villarreal', name: 'Villarreal CF', dataset: 'es.1', season: '2026-27' },
  { id: 'levante',    name: 'Levante UD',    dataset: 'es.1', season: '2026-27' },
  { id: 'castellon',  name: 'Castellón',     dataset: 'es.2', season: '2025-26' }
];

async function fetchDataset(code, season) {
  const url = `${BASE}/${season}/${code}.json`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'ValenciaFiles/1.0 (+github.com/mrl666/valencia-files)' }
  });
  if (!res.ok) throw new Error(`${code} HTTP ${res.status}`);
  return res.json();
}

function extractResults(dataset, teamName) {
  const matches = dataset.matches || [];
  const played = matches.filter(m => {
    if (!m.score || !m.score.ft) return false;
    return m.team1 === teamName || m.team2 === teamName;
  });

  played.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return played.slice(0, 3).map(m => {
    const home = m.team1 === teamName;
    const opponent = home ? m.team2 : m.team1;
    const score = home
      ? `${m.score.ft[0]}-${m.score.ft[1]}`
      : `${m.score.ft[1]}-${m.score.ft[0]}`;
    return { opponent, score, home, date: m.date || '' };
  });
}

function shortName(fullName) {
  return fullName.replace(/\s+(CF|UD|CD)$/, '');
}

async function run() {
  console.error('sport.js starting…');

  const byDataset = {};
  for (const team of TEAMS) {
    const key = `${team.dataset}@${team.season}`;
    if (!byDataset[key]) byDataset[key] = { dataset: team.dataset, season: team.season, teams: [] };
    byDataset[key].teams.push(team);
  }

  const output = [];

  for (const key of Object.keys(byDataset)) {
    const { dataset, season, teams } = byDataset[key];
    try {
      const data = await fetchDataset(dataset, season);
      console.error(`  ${dataset} (${season}): ${(data.matches || []).length} matches loaded`);

      for (const team of teams) {
        const results = extractResults(data, team.name);
        console.error(`  ${team.name}: ${results.length} played matches`);
        output.push({ id: team.id, name: shortName(team.name), results, season });
      }
    } catch (e) {
      console.error(`  ${dataset} (${season}): skipped — ${e.message}`);
      for (const team of teams) {
        output.push({ id: team.id, name: shortName(team.name), results: [], season });
      }
    }
  }

  console.log(JSON.stringify(output));
}

run()
  .then(() => console.error('sport.js finished OK'))
  .catch(err => {
    console.error('Sport scrape error:', err.message);
    process.exit(1);
  });
