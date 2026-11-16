// Alicante Cultural Agenda Scraper
// Source: https://agendacultural.diputacionalicante.es/eventos/lista/

const BASE = 'https://agendacultural.diputacionalicante.es';
const LIST_URL = 'https://agendacultural.diputacionalicante.es/eventos/lista/';

const MONTHS = {
  'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04', 'mayo': '05', 'junio': '06',
  'julio': '07', 'agosto': '08', 'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
};

function cleanText(raw) {
  return String(raw || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

async function fetchDateFromDetail(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return '';
    const html = await res.text();
    
    // Look for a date in format "DD de Month de YYYY" or "YYYY-MM-DD"
    const isoMatch = html.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    
    const esMatch = html.match(/(\d{1,2})\s+de\s+([a-zA-Z]+)\s+de\s+(\d{4})/i);
    if (esMatch) {
      const month = MONTHS[esMatch[2].toLowerCase()];
      if (month) return `${esMatch[3]}-${month}-${esMatch[1].padStart(2, '0')}`;
    }
  } catch (e) {
    // ignore
  }
  return '';
}

async function run() {
  console.error('events-alicante.js starting…');

  try {
    const res = await fetch(LIST_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ValenciaFiles/1.0)',
        'Accept': 'text/html'
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();

    const items = [];
    const seen = new Set();
    
// More flexible regex: matches /event/ URLs and captures titles from headings
const re = /<a[^>]+href="([^"]*\/event\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
    
    let m;
    let count = 0;
    // Limit to first 10 events to prevent the script from taking too long
    while ((m = re.exec(html)) !== null && count < 10) {
      const url = m[1];
      if (seen.has(url)) continue;
      
      const title = cleanText(m[2]);
      if (!title || title.length < 10) continue;

      // Fetch the detail page to get the date
      const date = await fetchDateFromDetail(url);
      
      const id = `alicante-${url.split('/').filter(Boolean).pop() || url}`;
      seen.add(url);
      
      items.push({
        id,
        title,
        url: url.startsWith('http') ? url : BASE + url,
        date,
        town: 'Alacant',
        sourceLabel: 'Diputació d\'Alacant — Agenda Cultural'
      });
      
      count++;
    }

    console.error(`events-alicante.js extracted ${items.length} items`);
    console.log(JSON.stringify(items));
  } catch (e) {
    console.error('Alicante events scrape error:', e.message);
    console.log('[]');
  }
}

run().then(() => console.error('events-alicante.js finished OK'));
