const fs = require('fs');

const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY;

async function run() {
  // 1. Fetch the Generalitat news page
  const listUrl = 'https://comunica.gva.es/es/totes';
  const res = await fetch(listUrl, {
    headers: { 'User-Agent': 'ValenciaFiles/1.0 (+https://github.com/mrl666/valencia-files)' }
  });
  if (!res.ok) throw new Error(`GVA HTTP ${res.status}`);
  const html = await res.text();

  // 2. Extract the first headline and link
  const linkRe = /<a[^>]+href="([^"]*detalle[^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  const match = linkRe.exec(html);
  if (!match) throw new Error('No lead headline found on GVA page');

  const url = match[1].startsWith('http') ? match[1] : 'https://comunica.gva.es' + match[1];
  const title = match[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

  // 3. Fetch a free image from Pixabay based on the headline keywords
  const keywords = title.split(' ').slice(0, 3).join('+'); // Use first 3 words as keywords
  const pixabayUrl = `https://pixabay.com/api/?key=${PIXABAY_API_KEY}&q=${keywords}&image_type=photo&orientation=horizontal&per_page=3`;
  const pixabayRes = await fetch(pixabayUrl);
  const pixabayData = await pixabayRes.json();
  const image = pixabayData.hits && pixabayData.hits.length > 0 ? pixabayData.hits[0] : null;

  const lead = {
    title,
    url,
    image: image ? {
      url: image.webformatURL,
      credit: `Photo by ${image.user} on Pixabay`,
      sourceUrl: image.pageURL
    } : null
  };

  console.log(JSON.stringify(lead));
}

run().catch(err => {
  console.error('Lead fetch error:', err.message);
  process.exit(1);
});
