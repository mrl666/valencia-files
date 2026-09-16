// Open-Meteo — free, no API key, one call.
// Valencia coordinates: 39.4699 N, -0.3763 W

const LAT = 39.4699;
const LON = -0.3763;

async function getWeather() {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${LAT}&longitude=${LON}` +
    `&current=temperature_2m,weather_code,wind_speed_10m` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
    `&timezone=Europe%2FMadrid&forecast_days=4`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
  const data = await res.json();

  // WMO weather code → short English description
  const wmo = {
    0: 'Clear', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Fog', 48: 'Rime fog',
    51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
    61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
    71: 'Light snow', 73: 'Snow', 75: 'Heavy snow',
    80: 'Rain showers', 81: 'Rain showers', 82: 'Violent showers',
    95: 'Thunderstorm', 96: 'Thunderstorm + hail', 99: 'Thunderstorm + hail'
  };

  // API sometimes returns "weather_code", sometimes "weathercode"
  const currentCode = data.current.weather_code ?? data.current.weathercode;

  const current = {
    temp: Math.round(data.current.temperature_2m),
    desc: wmo[currentCode] || '—',
    wind: Math.round(data.current.wind_speed_10m) + ' km/h'
  };

  const forecast = data.daily.time.slice(0, 4).map((iso, i) => {
    const dailyCode = (data.daily.weather_code ?? data.daily.weathercode)?.[i];
    return {
      day: new Date(iso).toLocaleDateString('en-GB', { weekday: 'short' }),
      high: Math.round(data.daily.temperature_2m_max[i]),
      low: Math.round(data.daily.temperature_2m_min[i]),
      desc: wmo[dailyCode] || ''
    };
  });

  return { current, forecast };
}

getWeather()
  .then(w => console.log(JSON.stringify(w)))
  .catch(err => {
    console.error('Weather error:', err.message);
    process.exit(1);
  });
