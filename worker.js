// Cloudflare Worker: perantara agar kunci Gemini tidak ada di kode web.
// Secret yang harus dibuat di Cloudflare: GEMINI_KEY
const DIIZINKAN = ['https://dewantara-studio.github.io'];

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': DIIZINKAN.includes(origin) ? origin : DIIZINKAN[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin'
    };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST' || !DIIZINKAN.includes(origin))
      return new Response('Forbidden', { status: 403, headers: cors });
    const body = await req.text();
    if (body.length > 4000000) return new Response('Too large', { status: 413, headers: cors });
    let payload = body;
    try {
      const j = JSON.parse(body);
      j.generationConfig = { thinkingConfig: { thinkingLevel: 'low' }, ...(j.generationConfig || {}) };
      payload = JSON.stringify(j);
    } catch (e) {}
    const r = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent',
      { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_KEY }, body: payload }
    );
    return new Response(r.body, { status: r.status, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
};
