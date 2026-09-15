const fs = require('fs');

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_TO = process.env.EMAIL_TO;

if (!RESEND_API_KEY || !EMAIL_TO) {
  console.error('Missing RESEND_API_KEY or EMAIL_TO');
  process.exit(1);
}

const html = fs.readFileSync('index.html', 'utf8');

async function send() {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Valencia Files <onboarding@resend.dev>',
      to: [EMAIL_TO],
      subject: 'Valencia Files — test edition',
      html: html
    })
  });

  const data = await res.json();

  if (!res.ok) {
    console.error('Send failed:', data);
    process.exit(1);
  }

  console.log('Sent OK. Id:', data.id);
}

send().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
