const API_KEY = process.env.AEMET_API_KEY;
const MUNICIPIO = '46250'; // València

async function fetchAemet(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`AEMET HTTP ${res.status}`);
  const envelope = await res.json();
  if (!envelope.datos) throw new Error('No datos URL in envelope');
  const dataRes = await fetch(envelope.datos);
  return dataRes.json();
}

async function getWeather() {
  const url = `https://opendata.aemet.es/opendata/api/prediccion/especifica/municipio/diaria/${MUNICIPIO}?api_key=${API_KEY}`;
  const data = await fetchAemet(url);

  const forecast = data[0].prediccion.dia.slice(0, 4).map(d => ({
    day: new Date(d.fecha).toLocaleDateString('en-GB', { weekday: 'short' }),
    high: d.temperatura.maxima,
    low: d.temperatura.minima,
    sky: d.estadoCielo[0]?.descripcion || '—'
  }));

  const now = data[0].prediccion.dia[0];
  const current = {
    temp: now.temperatura.maxima,
    desc: now.estadoCielo[0]?.descripcion || '—',
    wind: now.viento[0]?.velocidad || '—'
  };

  return { current, forecast };
}

getWeather()
  .then(w => {
    console.log(JSON.stringify(w));
  })
  .catch(err => {
    console.error('AEMET error:', err.message);
    process.exit(1);
  });
