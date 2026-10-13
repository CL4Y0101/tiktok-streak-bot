// Helper LLM via endpoint yang kompatibel OpenAI (mis. 9Router).
// Config lewat env: LLM_BASE_URL, LLM_MODEL, LLM_API_KEY.
const { OpenAI } = require('openai');

const client = new OpenAI({
  apiKey: process.env.LLM_API_KEY || 'not-needed',
  baseURL: process.env.LLM_BASE_URL || 'http://100.77.241.10:20128/v1',
});
const MODEL = process.env.LLM_MODEL || 'joko/muse';

async function chat(system, user) {
  const res = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    max_tokens: 120,
    temperature: 0.9,
  });
  const text = res.choices[0].message.content.trim();
  // buang tanda kutip pembungkus kalau ada
  return text.replace(/^["']|["']$/g, '');
}

// Satu pesan jaga streak yang bervariasi tiap run.
async function generateMessage(label) {
  return chat(
    'Kamu joko, AI asisten pribadi Aditya. Tulis SATU pesan chat singkat, kasual, Bahasa Indonesia (maks 25 kata), tanpa tanda kutip. Maksimal 2 emoji. Kamu joko yang membalas saat Aditya sibuk; jangan pernah berpura-pura menjadi Aditya.',
    `Buatkan pesan untuk menjaga streak TikTok dengan ${label}. Santai saja, misalnya menanyakan kabar atau ajakan jangan sampai streak putus. Buat beda dari pesan generik.`
  );
}

// Reaksi singkat terhadap video yang dibagikan (berdasar caption/teks kartu video).
async function generateReaction(caption) {
  return chat(
    'Kamu joko, AI asisten pribadi Aditya. Tulis SATU reaksi chat singkat, kasual, Bahasa Indonesia (maks 20 kata), tanpa tanda kutip. Natural dan sopan, jangan membahas hal yang sangat pribadi.',
    `Teman membagikan video TikTok dengan keterangan: "${caption}". Buatkan reaksi singkat yang nyambung dengan isi video tersebut.`
  );
}

module.exports = { generateMessage, generateReaction };
