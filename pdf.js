// Generate a PDF from the current index.html, keep only the first 3 pages.
// Output: editions/YYYY-MM-DD-HH.pdf

const fs = require('fs');
const path = require('path');
const { renderPdfFromHtml } = require('html-pdf-lite');
const { PDFDocument } = require('pdf-lib');

const MAX_PAGES = 3;

async function run() {
  const html = fs.readFileSync('index.html', 'utf8');

  const now = new Date();
  const stamp = now.toISOString().slice(0, 13).replace('T', '-');
  const outDir = 'editions';
  const outFile = path.join(outDir, `${stamp}.pdf`);

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // 1. Render the full PDF from HTML
  const fullPdfBuffer = await renderPdfFromHtml(html);
  console.error(`Full PDF rendered: ${fullPdfBuffer.length} bytes`);

  // 2. Load it and keep only the first N pages
  const srcDoc = await PDFDocument.load(fullPdfBuffer);
  const totalPages = srcDoc.getPageCount();
  console.error(`Total pages: ${totalPages}`);

  if (totalPages <= MAX_PAGES) {
    fs.writeFileSync(outFile, fullPdfBuffer);
    console.error(`PDF written (unchanged): ${outFile} (${fullPdfBuffer.length} bytes)`);
    return;
  }

  const outDoc = await PDFDocument.create();
  const pagesToCopy = Array.from({ length: MAX_PAGES }, (_, i) => i);
  const copiedPages = await outDoc.copyPages(srcDoc, pagesToCopy);
  copiedPages.forEach(p => outDoc.addPage(p));

  const trimmed = await outDoc.save();
  fs.writeFileSync(outFile, trimmed);
  console.error(`PDF written (trimmed to ${MAX_PAGES} of ${totalPages} pages): ${outFile} (${trimmed.length} bytes)`);
}

run().catch(err => {
  console.error('PDF error:', err.message);
  process.exit(1);
});
