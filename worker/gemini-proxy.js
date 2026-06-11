// Cloudflare Worker: LLM proxy for Data Sandbox (Dr. Gem).
// Keeps API keys server-side; the client bundle never sees them.
//
// Providers (first configured secret wins):
//   OPENROUTER_API_KEY -> OpenRouter chat completions (model: OPENROUTER_MODEL
//                         var, default google/gemini-2.5-flash)
//   GEMINI_API_KEY     -> Google Gemini direct
//
// Deploy:   cd worker && npx wrangler deploy
// Secret:   npx wrangler secret put OPENROUTER_API_KEY   (or GEMINI_API_KEY)
// Optional: ALLOWED_ORIGINS var = comma-separated origins (default: allow all)
// Client:   set VITE_GEMINI_PROXY_URL to the deployed worker URL.

const MODEL = 'gemini-2.5-flash';
const DEFAULT_OPENROUTER_MODEL = 'google/gemini-2.5-flash';
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
        if (!env.OPENROUTER_API_KEY && !env.GEMINI_API_KEY) {
            return Response.json({ error: 'No LLM secret configured (OPENROUTER_API_KEY or GEMINI_API_KEY)' }, { status: 500, headers: corsHeaders(allowOrigin) });
        }

        // Per-IP rate limiting (protects LLM credits from anonymous/demo abuse).
        // 3 requests / 10s burst + 8 requests / 60s sustained.
        const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
        try {
            const [burst, minute] = await Promise.all([
                env.RL_BURST?.limit({ key: ip }),
                env.RL_MINUTE?.limit({ key: ip }),
            ]);
            if ((burst && !burst.success) || (minute && !minute.success)) {
                return Response.json(
                    { error: 'Rate limit exceeded. Dr. Gem needs a short breather; try again in a minute.' },
                    { status: 429, headers: { ...corsHeaders(allowOrigin), 'Retry-After': '30' } }
                );
            }
        } catch {
            // If the binding is unavailable, fail open rather than break the tutor.
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

        let upstream;
        let extractText;

        if (env.OPENROUTER_API_KEY) {
            upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
                    'HTTP-Referer': 'https://datasandbox-36k.pages.dev',
                    'X-Title': 'Data Sandbox - Dr. Gem',
                },
                body: JSON.stringify({
                    model: env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL,
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 600,
                }),
            });
            extractText = (data) => data?.choices?.[0]?.message?.content || '';
        } else {
            upstream = await fetch(
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
            extractText = (data) => (data?.candidates?.[0]?.content?.parts || [])
                .map(p => p.text || '')
                .join('');
        }

        if (!upstream.ok) {
            // Pass 429 through so the client's backoff/retry logic still works.
            const status = upstream.status === 429 ? 429 : 502;
            return Response.json({ error: `LLM upstream error ${upstream.status}` }, { status, headers: corsHeaders(allowOrigin) });
        }

        const data = await upstream.json();
        return Response.json({ text: extractText(data) }, { headers: corsHeaders(allowOrigin) });
    },
};
