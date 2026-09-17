// Fetch news list from Valencia City Council (Spanish version)
// Source: https://www.valencia.es/cas/noticia/-/asset_publisher/R6s7fmDk1GN5/

async function getValenciaNews() {
  const url = 'https://www.valencia.es/cas/noticia/-/asset_publisher/R6s7fmDk1GN5/';

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'ValenciaFiles/1.0 (github.com/mrl666/valencia-files)',
      'Accept': 'text/html'
    }
  });

  if (!res.ok) throw new Error(`Valencia news HTTP ${res.status}`);
  const html = await res.text();

  // Extract news items: headlines + dates
  // The page lists them as headline text followed by a date like "09/09/2026"
  const newsRegex = /<a[^>]*href="([^"]*noticia[^"]*)"[^>]*>([^<]+)<\/a>[\s\S]*?(\d{2}\/\d{2}\/\d{4})/g;

  const items = [];
  let match;

  while ((match = newsRegex.exec(html)) !== null && items.length < 3) {
    items.push({
      title: match[2].trim(),
      url: match[1].startsWith('http') ? match[1] : 'https://www.valencia.es' + match[1],
      date: match[3]
    });
  }

  return items;
}

getValenciaNews()
  .then(items => console.log(JSON.stringify(items, null, 2)))
  .catch(err => {
    console.error('Valencia news error:', err.message);
    process.exit(1);
  });
