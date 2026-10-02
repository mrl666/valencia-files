// Generate archive.html from the files in editions/.

const fs = require('fs');
const path = require('path');

const EDITIONS_DIR = 'editions';
const OUT = 'archive.html';

function formatStamp(filename) {
  // 2026-10-02-08.pdf → 2 Oct 2026, 08:00
  const m = filename.match(/^(\d{4})-(\d{2})-(\d{2})-(\d{2})\.pdf$/);
  if (!m) return filename;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${parseInt(m[3], 10)} ${months[parseInt(m[2], 10) - 1]} ${m[1]}, ${m[4]}:00`;
}

function run() {
  if (!fs.existsSync(EDITIONS_DIR)) {
    console.error('No editions directory yet.');
    fs.writeFileSync(OUT, '<!DOCTYPE html><html><body><p>No editions yet.</p></body></html>');
    return;
  }

  const files = fs.readdirSync(EDITIONS_DIR)
    .filter(f => f.endsWith('.pdf'))
    .sort()
    .reverse();

  const rows = files.map(f => {
    const label = formatStamp(f);
    return `<li><a href="editions/${f}" target="_blank" rel="noopener">${label}</a></li>`;
  }).join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Valencia Files — Archive</title>
<style>
  body{font-family:Georgia,serif;max-width:640px;margin:40px auto;padding:0 20px;line-height:1.6;color:#111}
  h1{margin:0 0 6px}
  .sub{color:#666;font-style:italic;margin-bottom:24px}
  ul{list-style:none;padding:0}
  li{padding:10px 0;border-bottom:1px dotted #d8d8d8}
  a{color:#111;text-decoration:none}
  a:hover{text-decoration:underline}
</style>
</head>
<body>
  <h1>Valencia Files — Archive</h1>
  <div class="sub">${files.length} edition${files.length === 1 ? '' : 's'} so far.</div>
  <ul>
${rows}
  </ul>
</body>
</html>`;

  fs.writeFileSync(OUT, html);
  console.error(`archive.html written with ${files.length} editions.`);
}

run();
