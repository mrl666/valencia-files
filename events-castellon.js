// Castellón Cultural Events Scraper (UJI)
// Source: https://www.uji.es/cultura/noticies/

const URL = 'https://www.uji.es/cultura/noticies/';

function cleanText(raw) {
  return String(raw || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function run() {
  console.error('events-castellon.js starting…');

  try {
    const res = await fetch(URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ValenciaFiles/1.0)',
        'Accept': 'text/html'
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();

    const items = [];
    const seen = new Set();

    // The page lists events as paragraphs or list items containing a vertical bar "|".
    // We look for blocks of text that contain a date and a "|" separator.
    const re = /<(p|li)[^>]*>([\s\S]*?)<\/\1>/gi;

    let m;
    while ((m = re.exec(html)) !== null) {
      const text = cleanText(m[2]);
      
      // We only want blocks that look like events (they usually have a "|" and a month)
      if (!text.includes('|') || text.length < 20) continue;
      if (!/gener|febrer|març|abril|maig|juny|juliol|agost|setembre|octubre|novembre|desembre/i.test(text)) continue;

      // Extract a date for the JSON (we'll just grab the first day mentioned)
      let isoDate = '';
      const monthMap = {
        'gener':'01', 'febrer':'02', 'març':'03', 'abril':'04', 'maig':'05', 'juny':'06',
        'juliol':'07', 'agost':'08', 'setembre':'09', 'octubre':'10', 'novembre':'11', 'desembre':'12'
      };
      
      const dateMatch = text.match(/(\d{1,2})\s+de\s+([a-zàèéíòóúç]+)\s+de\s+(\d{4})/i);
      if (dateMatch) {
        const month = monthMap[dateMatch[2].toLowerCase()];
        if (month) isoDate = `${dateMatch[3]}-${month}-${dateMatch[1].padStart(2, '0')}`;
      } else {
        // Try format "Ds. 21 i Dg. 22 de novembre"
        const shortMatch = text.match(/(\d{1,2})\s+i\s+(?:Dg\.\s*)?(\d{1,2})\s+de\s+([a-zàèéíòóúç]+)/i);
        if (shortMatch) {
           const month = monthMap[shortMatch[3].toLowerCase()];
           if (month) {
             // Use next year if the month is early and current month is late (rough approximation)
             const year = new Date().getFullYear();
             isoDate = `${year}-${month}-${shortMatch[1].padStart(2, '0')}`;
           }
        }
      }

      if (!isoDate) continue;

      const id = `uji-${text.slice(0, 30).replace(/\s+/g, '-').toLowerCase()}`;
      if (seen.has(id)) continue;

      // Use the first part before "|" as the title, and the rest as the description
      const parts = text.split('|');
      const title = parts[0].trim();
      const description = parts.slice(1).join(' | ').trim();

      seen.add(id);
      items.push({
        id,
        title: title || 'UJI Cultural Event',
        description: description,
        url: URL,
        date: isoDate,
        town: 'Castelló',
        sourceLabel: 'UJI — Agenda Cultural'
      });
    }

    console.error(`events-castellon.js extracted ${items.length} items`);
    console.log(JSON.stringify(items.slice(0, 10)));
  } catch (e) {
    console.error('Castellón events scrape error:', e.message);
    console.log('[]');
  }
}

run().then(() => console.error('events-castellon.js finished OK'));
