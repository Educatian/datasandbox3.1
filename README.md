# Data Sandbox

An interactive statistics playground for learning data analysis by doing. Students manipulate
simulations (dart boards, balance beams, Galton boards, p-hacking fishers, ...) organized into a
10-assessment curriculum, with an AI tutor ("Dr. Gem") available inside each module and full
interaction telemetry for learning-analytics research.

## Stack

- React 19 + TypeScript + Vite, Tailwind CSS v4 (compiled via `@tailwindcss/vite`)
- Supabase: auth, module visibility scheduling (`module_settings`), interaction logs (`user_logs`)
- Gemini (`gemini-2.5-flash`) for the in-module AI tutor
- D3 for visualizations

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
```

Environment variables (`.env.local`):

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Dev-only direct Gemini access (production should use the worker proxy) |
| `VITE_GEMINI_PROXY_URL` | Cloudflare Worker proxy endpoint for Gemini (production) |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Supabase project |

Without Supabase configured the app shows the login page; with `?demo=1` in **dev builds only**
the login gate is bypassed (used by `scripts/run_screencast.mjs` for presentation capture).

## Scripts

- `npm run dev` / `npm run build` / `npm run preview`
- `npm test` — vitest golden-value tests for the statistics engine
- `node scripts/run_screencast.mjs` — automated Playwright screencast capture (run from repo root)
