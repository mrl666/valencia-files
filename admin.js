// Admin & deadlines — AEAT official iCalendar feeds.
// Downloads two Google Calendar .ics files published by the Spanish Tax Agency:
//   - Declaraciones informativas
//   - Cuenta Corriente Tributaria
// Parses upcoming events (next 60 days) and outputs the 5 nearest ones.

const fs = require('fs');

const ICS_FILES = [
  'aeat-declaraciones.ics',
  'aeat-cuenta-corriente.ics'
];

// --- Minimal iCalendar parser ---
function parseIcs(text) {
  const events = [];
  // Unfold long lines (RFC 5545: line continuation with leading space)
  const unfolded = text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');

  const blocks = unfolded.split('BEGIN:VEVENT');
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split('END:VEVENT')[0];
    const event = {};

    const lines = block.split(/\r?\n/);
    for (const line of lines) {
      const idx = line.indexOf(':');
      if (idx === -1) continue;
      const key = line.slice(0, idx).split(';')[0].toUpperCase();
      const value = line.slice(idx + 1).trim();
      if (key === 'SUMMARY') event.summary = value;
      if (key === 'DTSTART') event.dtstart = value;
      if (key === 'DESCRIPTION') event.description = value;
    }

    if (event.summary && event.dtstart) {
      // DTSTART format: YYYYMMDD or YYYYMMDDTHHMMSSZ
      const m = event.dtstart.match(/^(\d{4})(\d{2})(\d{2})/);
      if (m) event.date = `${m[1]}-${m[2]}-${m[3]}`;
      events.push(event);
    }
  }
  return events;
}

// --- Read an .ics file from disk ---
function readIcs(path) {
  try {
    return fs.readFileSync(path, 'utf8');
  } catch (e) {
    console.error(`  ${path}: not found — skipping`);
    return '';
  }
}

async function run() {
  console.error('admin.js starting…');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + 60);

  const all = [];

  for (const file of ICS_FILES) {
    const text = readIcs(file);
    if (!text) continue;
    const events = parseIcs(text);
    console.error(`  ${file}: ${events.length} events parsed`);

    for (const ev of events) {
      if (!ev.date) continue;
      const d = new Date(ev.date);
      if (isNaN(d)) continue;
      if (d < today || d > horizon) continue;

      all.push({
        title: ev.summary,
        detail: stripHtml(ev.description) || '',
        deadline: ev.date
      });
    }
  }

  // Sort by date, take the 5 nearest
  all.sort((a, b) => a.deadline.localeCompare(b.deadline));
  const picks = all.slice(0, 5);

  console.error(`admin.js extracted ${picks.length} upcoming deadlines`);
  console.log(JSON.stringify(picks));
}

function stripHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&aacute;/g, 'á').replace(/&eacute;/g, 'é').replace(/&iacute;/g, 'í')
    .replace(/&oacute;/g, 'ó').replace(/&uacute;/g, 'ú').replace(/&ntilde;/g, 'ñ')
    .replace(/\s+/g, ' ')
    .trim();
}

run()
  .then(() => console.error('admin.js finished OK'))
  .catch(err => {
    console.error('Admin scrape error:', err.message);
    process.exit(1);
  });
