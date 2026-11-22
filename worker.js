// Cloudflare Worker: perantara agar kunci Gemini tidak ada di kode web.
// Secret yang harus dibuat di Cloudflare: GEMINI_KEY
// Jika model utama sibuk (503/429), worker mencoba ulang lalu beralih ke model cadangan.
const DIIZINKAN = ['https://dewantara-studio.github.io'];
const MODEL = [
  { id: 'gemini-3.8-flash', think: true },
  { id: 'gemini-3.8-flash-lite', think: true },
  { id: 'gemini-flash-latest', think: false }
];
const ULANG = [429, 500, 502, 503, 504];

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': DIIZINKAN.includes(origin) ? origin : DIIZINKAN[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin'
    };
    const json = { ...cors, 'Content-Type': 'application/json' };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST' || !DIIZINKAN.includes(origin))
      return new Response('Forbidden', { status: 403, headers: cors });
    const body = await req.text();
    if (body.length > 4000000) return new Response('Too large', { status: 413, headers: cors });

    const mulai = Date.now();
    let last = null;
    for (const m of MODEL) {
      for (let i = 0; i < 2; i++) {
        if (Date.now() - mulai > 60000) break;
        let payload = body;
        try {
          const j = JSON.parse(body);
          if (m.think) j.generationConfig = { thinkingConfig: { thinkingLevel: 'low' }, ...(j.generationConfig || {}) };
          payload = JSON.stringify(j);
        } catch (e) {}
        try {
          const r = await fetch(
            'https://generativelanguage.googleapis.com/v1beta/models/' + m.id + ':generateContent',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_KEY },
              body: payload,
              signal: AbortSignal.timeout(45000)
            }
          );
          const txt = await r.text();
          last = { status: r.status, txt };
          if (r.ok || r.status === 401 || r.status === 403) return new Response(txt, { status: r.status, headers: json });
          if (ULANG.includes(r.status)) { await new Promise(s => setTimeout(s, 1500)); continue; }
          break; // galat lain (misalnya model tidak ada): coba model berikutnya
        } catch (e) {
          last = { status: 504, txt: JSON.stringify({ error: { message: 'Waktu tunggu Gemini habis.' } }) };
        }
      }
    }
    if (last) return new Response(last.txt, { status: last.status, headers: json });
    return new Response(JSON.stringify({ error: { message: 'Gemini tidak merespons. Coba lagi.' } }), { status: 504, headers: json });
  }
};
