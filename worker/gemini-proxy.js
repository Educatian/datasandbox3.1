// Cloudflare Worker: Gemini proxy for Data Sandbox.
// Keeps the GEMINI_API_KEY server-side; the client bundle never sees it.
//
// Deploy:   cd worker && npx wrangler deploy
// Secret:   npx wrangler secret put GEMINI_API_KEY
// Optional: ALLOWED_ORIGINS env var = comma-separated origins (default: allow all)
// Client:   set VITE_GEMINI_PROXY_URL to the deployed worker URL.

const MODEL = 'gemini-2.5-flash';
const MAX_PROMPT_CHARS = 8000;

const corsHeaders = (allowOrigin) => ({
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
});

export default {
    async fetch(request, env) {
        const origin = request.headers.get('Origin') || '';
        const allowed = (env.ALLOWED_ORIGINS || '*').trim();
        const allowOrigin = allowed === '*'
            ? '*'
            : (allowed.split(',').map(s => s.trim()).includes(origin) ? origin : '');

        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: corsHeaders(allowOrigin || '*') });
        }
        if (!allowOrigin) {
            return Response.json({ error: 'Origin not allowed' }, { status: 403 });
        }
        if (request.method !== 'POST') {
            return Response.json({ error: 'POST only' }, { status: 405, headers: corsHeaders(allowOrigin) });
        }
        if (!env.GEMINI_API_KEY) {
            return Response.json({ error: 'GEMINI_API_KEY secret not configured' }, { status: 500, headers: corsHeaders(allowOrigin) });
        }

        let prompt;
        try {
            const body = await request.json();
            prompt = body?.prompt;
        } catch {
            return Response.json({ error: 'Invalid JSON' }, { status: 400, headers: corsHeaders(allowOrigin) });
        }
        if (typeof prompt !== 'string' || !prompt.trim()) {
            return Response.json({ error: 'Missing prompt' }, { status: 400, headers: corsHeaders(allowOrigin) });
        }
        if (prompt.length > MAX_PROMPT_CHARS) {
            return Response.json({ error: 'Prompt too long' }, { status: 413, headers: corsHeaders(allowOrigin) });
        }

        const upstream = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': env.GEMINI_API_KEY,
                },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
            }
        );

        if (!upstream.ok) {
            // Pass 429 through so the client's backoff/retry logic still works.
            const status = upstream.status === 429 ? 429 : 502;
            return Response.json({ error: `Gemini upstream error ${upstream.status}` }, { status, headers: corsHeaders(allowOrigin) });
        }

        const data = await upstream.json();
        const text = (data?.candidates?.[0]?.content?.parts || [])
            .map(p => p.text || '')
            .join('');

        return Response.json({ text }, { headers: corsHeaders(allowOrigin) });
    },
};
