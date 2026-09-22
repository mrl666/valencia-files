const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY;

// Keywords for the Pixabay image — use general Valencia themes
const IMAGE_KEYWORDS = 'valencia spain';

async function fetchImage() {
  if (!PIXABAY_API_KEY) return null;
  try {
    const url = `https://pixabay.com/api/?key=${PIXABAY_API_KEY}` +
                `&q=${encodeURIComponent(IMAGE_KEYWORDS)}` +
                `&image_type=photo&orientation=horizontal&per_page=3&safesearch=true`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.hits && data.hits.length > 0) {
      const img = data.hits[0];
      return {
        url: img.webformatURL,
        credit: `Photo by ${img.user} on Pixabay`,
        sourceUrl: img.pageURL
      };
    }
  } catch (e) {
    // Ignore image errors — lead still works without an image
  }
  return null;
}

async function fetchLead() {
  const url = 'https://comunica.gva.es/es/totes';

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; ValenciaFiles/1.0; +https://github.com/mrl666/valencia-files)',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
    },
    redirect: 'follow'
  });
  if (!res.ok) throw new Error(`GVA HTTP ${res.status}`);
  const html = await res.text();

  // Extract the first news headline and link.
  // GVA items look like <a href="/es/detalle?id=...">TITLE</a> or similar.
  const linkRe = /<a[^>]+href="([^"]*(?:detalle|noticia)[^"]*)"[^>]*>([\s\S]*?)<\/a>/g;

  let match;
  let lead = null;
  while ((match = linkRe.exec(html)) !== null) {
    const link = match[1];
    const title = match[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (title.length < 15) continue;
    lead = {
      title,
      url: link.startsWith('http') ? link : 'https://comunica.gva.es' + link
    };
    break;
  }

  if (!lead) throw new Error('No GVA lead found');

  const image = await fetchImage();
  if (image) lead.image = image;

  return lead;
}

fetchLead()
  .then(lead => console.log(JSON.stringify(lead)))
  .catch(err => {
    console.error('Lead fetch error:', err.message);
    process.exit(1);
  });
