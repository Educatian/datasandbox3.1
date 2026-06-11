# Data Sandbox

An interactive statistics playground for learning data analysis by doing. Students manipulate
simulations (dart boards, balance beams, Galton boards, p-hacking fishers, ...) organized into a
10-assessment core curriculum plus a 25-module Advanced Track (ANOVA, SEM, IRT, BKT, SNA, LDA,
HMM, ...), with a Socratic AI tutor ("Dr. Gem") inside each module and full interaction telemetry
for learning-analytics research.

Key learning-experience features:

- **Predict-commit-test gates** (`components/ui/PredictGate.tsx`): learners commit to a prediction
  and a confidence judgment before a simulation unlocks; commitments are logged as conceptual
  telemetry (predict-observe-explain; Chance, delMas & Garfield 2004).
- **Exact statistics engine**: F/χ²/t p-values via real incomplete gamma/beta CDFs, t-based CIs,
  IRLS logistic regression; golden-value tested against scipy (`npm test`).
- **My Progress**: student dashboard over their own telemetry (modules explored, sessions, tutor use).
- **Admin analytics**: concept x day engagement heatmap and module reach for instructors,
  plus module visibility scheduling.
- **Advanced Track**: 25 research-methods/EDM modules, admin-gated like the core curriculum
  (run `docs/supabase_policies.sql` once to register them).

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
