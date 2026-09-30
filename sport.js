// Sport scraper — openfootball/football.json (public domain, no API key)
// Sources:
//   https://raw.githubusercontent.com/openfootball/football.json/master/2026-27/es.1.json  (La Liga)
//   https://raw.githubusercontent.com/openfootball/football.json/master/2026-27/es.2.json  (Segunda División)

const BASE = 'https://raw.githubusercontent.com/openfootball/football.json/master/2026-27';

const TEAMS = [
  { id: 'valencia',   name: 'Valencia CF',   dataset: 'es.1' },
  { id: 'villarreal', name: 'Villarreal CF', dataset: 'es.1' },
  { id: 'levante',    name: 'Levante UD',    dataset: 'es.1' },
  { id: 'castellon',  name: 'Castellón',     dataset: 'es.2' }
];

async function fetchDataset(code) {
  const url = `${BASE}/${code}.json`;
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

  // Sort by date desc, take the last 3
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

async function run() {
  console.error('sport.js starting…');

  // Group teams by dataset so we fetch each file once
  const datasets = {};
  const byDataset = {};
  for (const team of TEAMS) {
    if (!byDataset[team.dataset]) byDataset[team.dataset] = [];
    byDataset[team.dataset].push(team);
  }

  const output = [];

  for (const code of Object.keys(byDataset)) {
    try {
      const dataset = await fetchDataset(code);
      console.error(`  ${code}: ${(dataset.matches || []).length} matches loaded`);

      // Debug: list unique team names in this dataset
      const teamNames = new Set();
      (dataset.matches || []).forEach(m => {
        if (m.team1) teamNames.add(m.team1);
        if (m.team2) teamNames.add(m.team2);
      });
      console.error(`  ${code} team names:`, Array.from(teamNames).join(' | '));

      for (const team of byDataset[code]) {
        const results = extractResults(dataset, team.name);
        console.error(`  ${team.name}: ${results.length} played matches`);
        output.push({ id: team.id, name: team.name, results });
      }
    } catch (e) {
      console.error(`  ${code}: skipped — ${e.message}`);
      for (const team of byDataset[code]) {
        output.push({ id: team.id, name: team.name, results: [] });
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
