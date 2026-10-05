// Weather scraper — AEMET OpenData (official Spanish Meteorological Agency)
// Uses the two-step pattern: first request returns a "datos" URL, second fetches the data.
// Source: https://opendata.aemet.es
// Reuse conditions: cite AEMET as the author, do not distort the meaning.

const API_KEY = process.env.AEMET_API_KEY;

if (!API_KEY) {
  console.error('Missing AEMET_API_KEY');
  process.exit(1);
}

const CITIES = [
  { id: 'valencia',  name: 'Valencia',  ine: '46250' },
  { id: 'alicante',  name: 'Alicante',  ine: '03014' },
  { id: 'castellon', name: 'Castellón', ine: '12040' }
];

async function fetchAemet(endpoint) {
  const url = `https://opendata.aemet.es/opendata/api${endpoint}?api_key=${API_KEY}`;
  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'ValenciaFiles/1.0 (+github.com/mrl666/valencia-files)'
    }
  });
  if (!res.ok) throw new Error(`AEMET HTTP ${res.status}`);
  const envelope = await res.json();
  if (!envelope.datos) throw new Error('No datos URL in AEMET envelope');

  // Second request: fetch the actual data
  const dataRes = await fetch(envelope.datos);
  if (!dataRes.ok) throw new Error(`AEMET data HTTP ${dataRes.status}`);
  return dataRes.json();
}

function wmoFromAemet(skyDesc) {
  // AEMET returns descriptions in Spanish. Map to English short descriptions.
  const map = {
    // Clear / clouds
    'despejado': 'Clear',
    'poco nuboso': 'Partly cloudy',
    'intervalos nubosos': 'Mostly cloudy',
    'nuboso': 'Cloudy',
    'muy nuboso': 'Overcast',
    'cubierto': 'Overcast',
    'nubes altas': 'High clouds',

    // Rain
    'intervalos nubosos con lluvia': 'Rain showers',
    'nuboso con lluvia': 'Rain',
    'muy nuboso con lluvia': 'Heavy rain',
    'cubierto con lluvia': 'Heavy rain',
    'intervalos nubosos con lluvia escasa': 'Light showers',
    'nuboso con lluvia escasa': 'Light rain',
    'muy nuboso con lluvia escasa': 'Light rain',
    'cubierto con lluvia escasa': 'Light rain',
    'llovizna': 'Drizzle',
    'chubascos': 'Showers',
    'chubascos fuertes': 'Heavy showers',

    // Thunderstorm
    'tormenta': 'Thunderstorm',
    'intervalos nubosos con tormenta': 'Thunderstorms',
    'nuboso con tormenta': 'Thunderstorms',
    'muy nuboso con tormenta': 'Thunderstorms',
    'cubierto con tormenta': 'Thunderstorms',

    // Snow
    'nuboso con nieve': 'Snow',
    'muy nuboso con nieve': 'Heavy snow',
    'cubierto con nieve': 'Snow',
    'intervalos nubosos con nieve': 'Snow showers',

    // Other
    'niebla': 'Fog',
    'bruma': 'Mist',
    'calima': 'Haze',
    'helada': 'Frost'
  };

  const key = String(skyDesc || '').toLowerCase().trim();
  return map[key] || skyDesc || '—';
}

async function fetchCity(city) {
  const endpoint = `/prediccion/especifica/municipio/diaria/${city.ine}`;
  const data = await fetchAemet(endpoint);

  // data[0].prediccion.dia[0] = today
  const today = data[0]?.prediccion?.dia?.[0];
  if (!today) throw new Error(`No forecast for ${city.name}`);

  const current = {
    temp: today.temperatura?.maxima ?? '—',
    desc: wmoFromAemet(today.estadoCielo?.[0]?.descripcion)
  };

  const forecast = (data[0].prediccion.dia || []).slice(0, 4).map(d => ({
    day: new Date(d.fecha).toLocaleDateString('en-GB', { weekday: 'short' }),
    high: d.temperatura?.maxima ?? '—'
  }));

  return {
    id: city.id,
    name: city.name,
    current,
    forecast
  };
}

async function run() {
  console.error('weather.js (AEMET) starting…');

  const results = [];
  for (const city of CITIES) {
    try {
      const w = await fetchCity(city);
      console.error(`  ${city.name}: ${w.current.temp}° ${w.current.desc}`);
      results.push(w);
    } catch (e) {
      console.error(`  ${city.name}: skipped — ${e.message}`);
      results.push({
        id: city.id,
        name: city.name,
        current: { temp: '—', desc: '—' },
        forecast: []
      });
    }
  }

  console.log(JSON.stringify(results));
}

run()
  .then(() => console.error('weather.js finished OK'))
  .catch(err => {
    console.error('AEMET weather error:', err.message);
    process.exit(1);
  });
