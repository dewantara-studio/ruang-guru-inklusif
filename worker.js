// Cloudflare Worker: perantara agar kunci Gemini tidak ada di kode web.
// Secret yang harus dibuat di Cloudflare: GEMINI_KEY
const DIIZINKAN = ['https://dewantara-studio.github.io'];
// Dicoba berurutan; jika satu model sibuk/lambat, otomatis pindah ke berikutnya.
const PERCOBAAN = [['gemini-3.8-flash', 'low'], ['gemini-3.7-flash', 'low'], ['gemini-3.6-flash', 'low'], ['gemini-3.5-flash-lite', null], ['gemini-3.1-flash-lite', null]];

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
    let data;
    try { data = JSON.parse(body); } catch (e) { return new Response('Bad request', { status: 400, headers: cors }); }

    let galat = null;
    for (const [model, mikir] of PERCOBAAN) {
      const b = { ...data, generationConfig: { ...(data.generationConfig || {}) } };
      if (mikir) b.generationConfig.thinkingConfig = { thinkingLevel: mikir };
      else delete b.generationConfig.thinkingConfig;
      try {
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_KEY },
            body: JSON.stringify(b),
            signal: AbortSignal.timeout(20000)
          }
        );
        if (r.ok) return new Response(r.body, { status: 200, headers: json });
        galat = await r.text();
      } catch (e) { /* lambat atau gagal terhubung: coba model berikutnya */ }
    }
    return new Response(
      galat || JSON.stringify({ error: { message: 'AI sedang sibuk atau lambat. Coba lagi sebentar lagi.' } }),
      { status: 503, headers: json }
    );
  }
};
