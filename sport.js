// Sport scraper — openfootball/espana (public domain, no API key)
// Sources:
//   2026-27/1-liga.json  — La Liga (Valencia, Villarreal, Levante)
//   2026-27/2-liga.json  — Segunda División (Castellón, if published)

const BASE = 'https://raw.githubusercontent.com/openfootball/football.json/master';

const TEAMS = [
  { id: 'valencia',   name: 'Valencia CF',   dataset: 'es.1', season: '2026-27' },
  { id: 'villarreal', name: 'Villarreal CF', dataset: 'es.1', season: '2026-27' },
  { id: 'levante',    name: 'Levante UD',    dataset: 'es.1', season: '2026-27' },
  { id: 'castellon',  name: 'CD Castellón',  dataset: 'es.2', season: '2025-26' }
];

async function fetchDataset(dataset, season) {
  const url = `${BASE}/${season}/${dataset}.json`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'ValenciaFiles/1.0 (+github.com/mrl666/valencia-files)' }
  });
  if (!res.ok) throw new Error(`${dataset} HTTP ${res.status}`);
  return res.json();
}

function extractResults(dataset, team) {
  const names = team.aliases || [team.name];
  const matches = dataset.matches || [];

  const played = matches.filter(m => {
    if (!m.score) return false;
    // Score can be an object with .ft, or a plain array [home, away]
    const hasScore = Array.isArray(m.score) || (m.score.ft && m.score.ft.length === 2);
    if (!hasScore) return false;
    return names.includes(m.team1) || names.includes(m.team2);
  });

  played.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return played.slice(0, 3).map(m => {
    const home = names.includes(m.team1);
    const opponent = home ? m.team2 : m.team1;

    // Normalise score to [homeGoals, awayGoals]
    let homeGoals, awayGoals;
    if (Array.isArray(m.score)) {
      [homeGoals, awayGoals] = m.score;
    } else {
      [homeGoals, awayGoals] = m.score.ft;
    }

    const score = home
      ? `${homeGoals}-${awayGoals}`
      : `${awayGoals}-${homeGoals}`;

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
        const results = extractResults(data, team);
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
