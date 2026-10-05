# CreatorOS — Current State Evaluation

**Date:** 2026-10-03 · **Commit:** `392865e` (main, clean tree, in sync with origin) · **Method:** 4 parallel read-only investigations (frontend, backend/security/deploy, build/tests/tooling/git, feature completeness vs README). Evidence: file:line citations throughout; full sub-reports in `.zwork/runs/972ba1cd/`.

---

## 1. Executive summary

CreatorOS is an **actively developed, demo-grade AI product with a genuinely working creative core and a largely fake growth/community layer** — roughly **60–65% of README-claimed features are fully real**, skewed real in "create" (Studio, Scene Planner, Retention Lab, Video Studio, Repurposer, Branding, Ideas, Co-Pilot all truly wired to Gemini) and fake in "grow/connect" (TikTok analytics returns constants, Community is hardcoded fiction, no billing).

The single most consequential defect is **deployment security**: the Vercel build path (`build:server` → `api/_server.js`) bundles `server.ts` **without** the `security-entry.ts` auth/rate-limit wrapper, and the Gemini routes themselves declare no auth — so production API access to Gemini (text, image, video) is **unauthenticated and unthrottled**, exposing `GEMINI_API_KEY` to abuse. Compounding: server CRUD persists to sqlite at `/tmp` on Vercel (ephemeral → silent data loss) while the client treats Firestore as the system of record — a split-brain data layer.

Engineering hygiene is a mixed bag: typecheck is verifiably clean and git is disciplined, but CI proves nothing, ESLint is broken and unused, there are zero unit tests, TS strict mode is off with 157 `any`s, and 14 run-once codegen scripts litter the root.

**Overall: promising product, not production-ready.** The AI core and auth/Firestore foundation are sound; the production deploy path, data-layer coherence, and safety net need real work before public launch.

---

## 2. Snapshot

| Fact | Value |
|---|---|
| Stack | React 19 + Vite 6 + TS 5.8 + Tailwind 4 + motion; Express 5 + Gemini (`@google/genai`); Firebase Auth + Firestore; sqlite (better-sqlite3) server CRUD |
| Frontend size | 61 files / 16,519 LOC under `src/`; 46 lazy-loaded views |
| Repo | 102 tracked files, 51 commits, 2 authors (solo-ish), first commit 2026-08-08, last 2026-10-01 |
| Activity phase | Deploy-debugging on Vercel (~8 commits on 2026-10-01 chasing serverless boot) |
| Tests | 1 real e2e smoke flow (4 tests, 4 browser projects), 0 unit tests |
| Secrets in repo | None (only Firebase *web* config + README placeholder) |

## 3. Scorecard

| Dimension | Grade | One-line rationale |
|---|---|---|
| Core feature delivery (create tools) | **B+** | 8 Gemini-backed features genuinely implemented and wired |
| Growth/community features | **D** | TikTok sync, Community, billing, Roadmap are stubs/fakes |
| Security (dev path) | **B−** | Wrapper + rate limits exist; a few routes slip through |
| Security (production path) | **F** | Vercel bundle bypasses all of it; OAuth state forgeable |
| Data architecture | **D+** | Firestore vs sqlite split-brain; ephemeral writes on Vercel |
| Type/build health | **A−** | `tsc --noEmit` clean; real code splitting; no client secrets |
| Test & CI safety net | **D** | CI is an echo; lint ≠ eslint; no unit tests; e2e thin but real |
| Repo hygiene | **B−** | Clean tree, honest history; 14 dead scripts, dual lockfiles, committed bundle |

---

## 4. Feature completeness (README claim → reality)

| Claimed | Status | Key evidence |
|---|---|---|
| Content Studio & Editor (AI polish, voiceover) | **Full** | `ContentStudio.tsx`, `ContentEditorView.tsx`, `AIToolPanel.tsx` → real `quickPolish/generateSpeech/transcribeAudio` |
| Scene Planner ("Vertano") | **Full** | `ScenePlanner.tsx:33,122`; real prompt `services/gemini.ts:468` |
| Retention Lab (First 5s, heatmaps) | **Full** | `RetentionHookLab.tsx:64,68`; JSON contract `gemini.ts:605-637` |
| Video Studio (imagery, TTS, playback) | **Full** | `useVideoGeneration.ts:127-176` real polling loop + localforage |
| Content Repurposer | **Full** | `ContentRepurposer.tsx:27` |
| Branding Engine | **Full** | `BrandingEngine.tsx` → `generateBrandKit/generateBrandLogo` |
| Video Ideas Pipeline | **Full** | `VideoIdeas.tsx` → `generateContentIdeas` |
| Perfect Prompt Co-Pilot | **Full** | `PerfectPromptCopilot.tsx:176` |
| First Dollar Dashboard | **Partial** | Real `/api/analytics/summary`, hardcoded fallbacks `FirstDollarDashboard.tsx:66-79` |
| Dashboard & Reports (YT/TikTok sync) | **Partial** | YouTube real (OAuth + `channels.list`); **TikTok returns constants** (`api/_server.js:958,1001`) |
| Roadmap | **Stub** | `Roadmap.tsx:6,51` static stages, `completedDays=[1]` |
| Creator Hub & Community | **Partial + Stub** | Hub = real Firestore content calendar but nav-locked; Community = hardcoded leaderboard/feed, input has no handler |
| Profile Management | **Partial** | Real OAuth linking; subscription is a static "Free Plan" label; **no billing code exists** |
| Help Center | **Partial** | Static content; unauthored topics "coming soon" |
| Firebase auth + Firestore sync | **Full** | Live `onSnapshot` across App/SupportHub |

**Mock hotspots:** TikTok analytics (constants `1240/45000/8900`) · Community fiction (picsum avatars, "1,204 Active") · SupportHub "E2E test" is a scripted `setTimeout` log animation printing fake "PASS (0 security vulnerabilities)" · `Reports.tsx:22` dead `DEMO_PROJECTS` · `index.html` JSON-LD ships fabricated `aggregateRating 4.9 / 15,200 reviews` (SEO/legal exposure).

**Build freshness:** `dist/` is current (built after newest source; content parity verified).

---

## 5. Security & deployment

**Topology:** three targets, one ships unprotected.
- `security-entry.ts` (dev + `npm run build` → `dist/server.js`): monkey-patches `express.application.post` to wrap 5 paths with Firebase auth + rate limits, then imports `server.ts`.
- `server.ts` direct (`build:server` → `api/_server.js` → Vercel via `vercel.json` rewrite): **wrapper never applied** — grep of `api/_server.js` for `protectGeminiRoute`/`consumeRateLimit`/`X-RateLimit`: **0 hits**.

**Findings:**
- **[Critical] Unauthenticated Gemini abuse in production.** Gemini routes declare no `authenticateUser` (`server.ts:235,266,310,671,703,737`); on Vercel anyone can burn `GEMINI_API_KEY` — no auth, no rate limit, no model allowlist, no payload cap. Even on the Node path, `generate-image` and `niche-sparks` are outside the wrapper's 5 guarded paths (`security-entry.ts:26-32`).
- **[High] OAuth account-linking forgery.** Google/TikTok callbacks trust `state` as the userId with no session binding (`server.ts:767,774-777,846,853-855`); attacker can plant their platform tokens under any user. Tokens stored **plaintext** in sqlite `user_accounts` (`src/db.ts:88-97`).
- **[High] Auth verification hinges on one env var.** Without `FIREBASE_SERVICE_ACCOUNT`, `verifyIdToken` can't certify and every token route 401s on Vercel (`server.ts:35-43`) — unverifiable from repo; must be confirmed in Vercel settings.
- **[Medium] Firestore rules are otherwise strict** (default deny, per-user isolation, owner immutability) with two weak spots: `/test/{docId}` readable by any authed user (line 75); admin = one hardcoded Gmail (line 15).
- **[Low] `api/index.js` leaks stack traces via `?debug=`.**
- **Secret scan:** clean apart from the by-design Firebase web key (`firebase-applet-config.json:4`).

## 6. Data layer — split-brain

Four stacks present, one live per side:
- **better-sqlite3** is the only server store (`server.ts:6` → `src/db.ts`; users/brands/content/analytics/streaks/accounts) — but at `/tmp/creator_os.db` on Vercel it is **ephemeral**: server-side writes silently vanish between invocations.
- **pg + drizzle** (`src/db/index.ts`, `schema.ts`, `drizzle.config.ts`) — dead scaffolding, imported by nothing.
- **firebase-admin** — token verification only. **Firebase client SDK** — the real client store, plus `server.ts:1095` reads Firestore via REST.

Firestore is fully modeled as the intended system of record (`firebase-blueprint.json`); backend CRUD writes elsewhere. This must converge.

## 7. Frontend architecture & code health

- **Entry→views:** `main.tsx` (StrictMode, error monitoring) → `App.tsx` = auth gate + hand-rolled `pushState` router + nav registry → 46 lazy views. State: no store library; 13 root `useState`, props drilled 14 deep; every Firestore snapshot re-renders the whole tree.
- **[Critical] TS strict is off** (`tsconfig.json`: no `strict`/`noImplicitAny`), 157 `any`s, any-typed root state guarding unvalidated AI JSON. Plus `@/*` alias points at repo root while Vite maps `@` → `./src` (editor vs bundler disagree).
- **[High] Divergent fetch helpers:** `authorizedFetch` always attaches bearer token; `apiFetch` only for `/api/gemini/*` (`firebase.ts:216-220`); bare `fetch` at `ContentStudio.tsx:106` → silent unauthenticated calls possible.
- **[High] Navigation ephemeral:** tabs aren't URLs; no deep links; back button doesn't restore state.
- **[Medium] Monoliths:** `CalendarView` 1,468 LOC, `LandingPage` 1,155 LOC; one root ErrorBoundary for 46 views; error telemetry writes to the Firestore it reports on.
- **Strengths:** real code splitting + manual chunks; **zero client-side secrets** (`@google/genai` never bundled); genuine global error observability with dedupe/caps; anti-hang auth engineering (popup→redirect fallback, 2.5s/3.5s guards); honest loading/error states; 0 `dangerouslySetInnerHTML`.

## 8. Build, tests, tooling, process

- **Typecheck: verifiably clean** — `tsc --noEmit` exit 0 (but e2e/ and playwright.config are excluded from it).
- **ESLint: broken and unused** — `"lint"` runs tsc only; `npx eslint .` → 109 errors (67 in the committed bundle; no Node globals, no TS parser → src silently skipped).
- **CI is a heartbeat:** `.github/workflows/ci.yml` only echoes runner versions. No typecheck/lint/test/build gate.
- **Tests:** zero unit tests; 2 e2e specs — `app.spec.ts` is vacuously-guarded, `smoke_tests.spec.ts` is a genuine full-flow test (signup → onboarding → Video Studio → generate) but hits live Firebase and embeds a literal password.
- **Hygiene:** clean tree, in sync; both `bun.lock` and `package-lock.json` tracked; committed build artifact (`api/_server.js` + map) — deliberate for Vercel tracing, but can go stale (`vercel.json` sets no `buildCommand`, so Vercel's default build doesn't regenerate it); `version: 0.0.0`; no Prettier/EditorConfig/hooks.
- **Dead weight:** 14 of 15 root scripts are run-once codegen/refactor/probe scripts (all six refactor scripts share one timestamp, 2026-09-20) — evidence of AI-agent codegen surgery decomposing a monolithic ContentStudio; `get-icons.js` requires `glob`, a dep not even declared. Delete or archive.

---

## 9. Ranked risk register

| # | Severity | Risk | Fix direction |
|---|---|---|---|
| 1 | **Critical** | Vercel path ships `server.ts` without security wrapper → unauthenticated, unthrottled Gemini API abuse | Wrap at route level inside `server.ts` itself (belt-and-braces), not via entry monkey-patch; regenerate `api/_server.js` in Vercel build |
| 2 | High | Server writes to ephemeral `/tmp` sqlite on Vercel → silent data loss; split-brain vs Firestore | Converge on Firestore for all persistence (admin SDK server-side) |
| 3 | High | OAuth `state`=userId forgery → token planting under arbitrary accounts; plaintext tokens at rest | Signed, session-bound state; encrypt tokens at rest |
| 4 | High | `FIREBASE_SERVICE_ACCOUNT` missing ⇒ all authed API routes 401 in production | Verify/set in Vercel env; fail fast at boot when absent |
| 5 | Medium | Fabricated data shipped (fake ratings in JSON-LD, fake community, fake TikTok stats, fake "test PASS" log) | Remove or clearly label before any public launch |
| 6 | Medium | No safety net: nominal CI, broken eslint, zero unit tests, vacuous e2e assertions | CI = typecheck + fixed eslint + build + smoke e2e |
| 7 | Medium | Strict-off TS + 157 `any`s on AI payloads; divergent auth fetch helpers; alias mismatch | Enable strict incrementally; type AI contracts; unify on one authed fetch |
| 8 | Low | Monolith views, root re-renders, ephemeral tab navigation, 14 dead scripts, dual lockfiles | Incremental refactor; router; purge scripts/scripts/archive; one lockfile |

## 10. Recommended action plan

**P0 — before next production deploy (days)**
1. Move Gemini auth + rate limiting into `server.ts` route declarations themselves (don't depend on entry-file wrapper); set `vercel.json` `buildCommand` to `npm run build && npm run build:server`.
2. Confirm `FIREBASE_SERVICE_ACCOUNT` in Vercel env; add boot-time fail-fast.
3. Fix OAuth callback `state` binding; stop storing platform tokens plaintext.
4. Decide the persistence story: Firestore everywhere (recommended) or a real server DB — kill the `/tmp` sqlite path.

**P1 — this month**
5. Real CI: typecheck + working eslint (Node globals + TS parser + ignore `api/`, `dist/`) + build + Playwright smoke.
6. Strip fabricated data (JSON-LD ratings, Community literals, fake TikTok metrics) or gate behind "demo data" labels.
7. Enable TS `strict` incrementally; define zod/typed contracts for Gemini responses; unify `apiFetch`/`authorizedFetch`.

**P2 — quality of life**
8. Introduce a router (URL-addressable tabs), split monolith views, memoize snapshot-driven re-renders.
9. Purge/archive the 14 dead root scripts, drop `bun.lock` or `package-lock.json`, add Prettier, remove `/test` Firestore rule and `?debug` trace leak.

---

## 11. Bottom line

CreatorOS is a **credible, working AI creator tool wearing an unfinished platform costume**. The creative core (8 real Gemini features), Firebase auth, strict Firestore rules, clean typecheck, and disciplined git history are genuine strengths. But the production deployment currently ships without API protection, the server data layer loses writes by design on serverless, and the growth/community narrative is stagecraft. Fix the P0 items and it's a solid private beta; fix P0+P1 and it's honestly launchable.
