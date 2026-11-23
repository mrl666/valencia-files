async function fetchGvaLead() {
  try {
    const res = await fetch(GVA_URL, {
      headers: { 'User-Agent': UA, 'Accept': 'text/html' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();

    const linkRe = /<a[^>]+href="([^"]*(?:detalle|noticia)[^"]*)"[^>]*>([\s\S]*?)<\/a>/g;
    let match;
    const found = [];
    
    while ((match = linkRe.exec(html)) !== null && found.length < 2) {
      const link = match[1];
      const title = match[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      if (title.length < 15) continue;
      
      found.push({
        title,
        url: link.startsWith('http') ? link : 'https://comunica.gva.es' + link,
        source: 'Generalitat Valenciana'
      });
    }

    if (found.length === 0) return null;
    
    // Return them as lead 1 and lead 2
    return {
      title: found[0].title,
      url: found[0].url,
      source: found[0].source,
      title2: found[1] ? found[1].title : '',
      url2: found[1] ? found[1].url : '',
      source2: found[1] ? found[1].source : ''
    };
  } catch (e) {
    console.error(`  GVA: failed — ${e.message}`);
    return null;
  }
}
