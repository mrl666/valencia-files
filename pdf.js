// Generate a PDF from the current index.html.
// Output: editions/YYYY-MM-DD-HH.pdf

const fs = require('fs');
const path = require('path');
const { renderPdfFromHtml } = require('html-pdf-lite');

async function run() {
  const html = fs.readFileSync('index.html', 'utf8');

  const now = new Date();
  const stamp = now.toISOString().slice(0, 13).replace('T', '-'); // 2026-10-02-08
  const outDir = 'editions';
  const outFile = path.join(outDir, `${stamp}.pdf`);

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const pdf = await renderPdfFromHtml(html);
  fs.writeFileSync(outFile, pdf);

  console.error(`PDF written: ${outFile} (${pdf.length} bytes)`);
}

run().catch(err => {
  console.error('PDF error:', err.message);
  process.exit(1);
});
