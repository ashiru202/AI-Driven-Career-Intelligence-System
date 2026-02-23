require('dotenv').config();
const Groq = require('groq-sdk');

const key = process.env.GROQ_API_KEY;
console.log('GROQ_API_KEY present:', !!key, key ? key.slice(0, 8) + '...' : 'MISSING');

if (!key) { console.error('No key!'); process.exit(1); }

const groq = new Groq({ apiKey: key });
groq.chat.completions.create({
  model: 'llama-3.3-70b-versatile',
  messages: [{ role: 'user', content: 'Reply with this exact JSON array only, no other text: ["Suggestion one.", "Suggestion two."]' }],
  temperature: 0.7,
}).then(r => {
  console.log('SUCCESS, model:', 'groq');
  console.log('Response:', r.choices[0].message.content);
}).catch(e => {
  console.error('FAIL:', e.message);
});
