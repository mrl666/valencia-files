// Open-Meteo — free, no API key, one call per city.
// Coordinates: Valencia, Alicante, Castellón de la Plana

const CITIES = [
  { id: 'valencia',  name: 'Valencia',  lat: 39.4699, lon: -0.3763 },
  { id: 'alicante',  name: 'Alicante',  lat: 38.3452, lon: -0.4810 },
  { id: 'castellon', name: 'Castellón', lat: 39.9864, lon: -0.0513 }
];

const WMO = {
  0: 'Clear', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Rime fog',
  51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
  61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
  71: 'Light snow', 73: 'Snow', 75: 'Heavy snow',
  80: 'Rain showers', 81: 'Rain showers', 82: 'Violent showers',
  95: 'Thunderstorm', 96: 'Thunderstorm + hail', 99: 'Thunderstorm + hail'
};

async function fetchCity(city) {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${city.lat}&longitude=${city.lon}` +
    `&current=temperature_2m,weather_code,wind_speed_10m` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
    `&timezone=Europe%2FMadrid&forecast_days=4`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`${city.name} HTTP ${res.status}`);
  const data = await res.json();

  const currentCode = data.current.weather_code ?? data.current.weathercode;

  return {
    id: city.id,
    name: city.name,
    current: {
      temp: Math.round(data.current.temperature_2m),
      desc: WMO[currentCode] || '—',
      wind: Math.round(data.current.wind_speed_10m) + ' km/h'
    },
    forecast: data.daily.time.slice(0, 4).map((iso, i) => {
      const code = (data.daily.weather_code ?? data.daily.weathercode)?.[i];
      return {
        day: new Date(iso).toLocaleDateString('en-GB', { weekday: 'short' }),
        high: Math.round(data.daily.temperature_2m_max[i]),
        low: Math.round(data.daily.temperature_2m_min[i]),
        desc: WMO[code] || ''
      };
    })
  };
}

async function getAll() {
  return Promise.all(CITIES.map(fetchCity));
}

getAll()
  .then(all => console.log(JSON.stringify(all)))
  .catch(err => {
    console.error('Weather error:', err.message);
    process.exit(1);
  });
