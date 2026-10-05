# CreatorOS — Production-Readiness Fix Plan

**Date:** 2026-10-04 · **Basis:** evaluation of commit `dbcf30d` (main, post-authorship-rewrite) · **Mode:** planning only, no code changed
**Goal:** take CreatorOS from *demo-grade with a real AI core* to **production-grade, world-class** — secure in production, honest in what it shows users, lossless in what it stores, and defended by a real engineering safety net.

**How to read this plan:** every fix has an ID (`F#.#`), an effort (S ≤ 0.5d, M ≤ 2d, L ≤ 5d), logic, and where a real fork exists, a **DECISION** box with options and a recommendation. A decision summary table at the end collects all 11 forks. Assumed bar: **public launch** (per "world class"); if you're targeting private beta first, Phase 6 shrinks and Phases 1–4 are unchanged.

---

## Current state in one paragraph

CreatorOS is a React 19 + Vite SPA with 46 lazily-loaded views and 8 genuinely working Gemini-backed creative features, backed by Express + Firebase Auth. It is not production-grade because: (1) the Vercel deploy path bundles `server.ts` **without** the auth/rate-limit wrapper — Gemini endpoints are unauthenticated and unthrottled in production; (2) the server writes user data to ephemeral `/tmp` sqlite on serverless — silent data loss; (3) OAuth account-linking trusts a forgeable `state`; (4) a whole layer of the product (Community, TikTok analytics, billing, Roadmap) is fabricated; (5) the safety net is nominal — CI echoes versions, ESLint is broken/unused, zero unit tests, TS strict off. The plan attacks in that order.

---

## Phase 0 — Pre-flight hygiene & pending items

### F0.1 — Resolve the Vercel bot branch (carries pre-rewrite history) · Effort: S
The remote branch `vercel/install-vercel-speed-insights-k29xze` (tip `af7537a`) was created by Vercel's Speed Insights onboarding and is based on the **old, pre-rewrite lineage** — it still contains 10 Mick-authored commits. It is the last Mick carrier outside the backup bundle.

> **DECISION D0** — Options:
> **A. Rebuild branch on new history, keep changes** *(recommended)* — cherry-pick the one bot commit ("Install Vercel Speed Insights") onto current `main`, force-update the branch, push. Preserves the changeset, scrubs the lineage.
> **B. Delete the branch** — simplest; Speed Insights can be reinstalled later from Vercel's dashboard (it will recreate the branch from current history).
> **C. Leave it** — zero effort, but Mick history stays publicly reachable on your repo. *Not recommended given you just paid to strip it.*

Logic: the rewrite you ordered isn't complete while old lineage is reachable from a live ref. A preserves work; B is acceptable if Speed Insights isn't a priority. Related: keep the backup bundle `CreatorOS_Repo_backup_pre-rewrite_20261003.bundle` until the rewritten history has survived ≥2 weeks in production, then delete it (it contains the Mick history by design).

### F0.2 — Purge the 14 dead root scripts · Effort: S
`create_ai_tool_panel.cjs`, `update_content_studio.cjs`, `update_video_studio.cjs`, `refactor.cjs`, `refactor.ts`, `fix_format.cjs`, `patch-icons.ts`, `get-icons.js`, and 6 `test-*.mjs/js` probes are run-once artifacts of AI codegen surgery (all refactor scripts share one timestamp; `get-icons.js` requires an undeclared dep). They inflate ESLint noise, confuse contributors, and invite accidental live-DB writes (the `test-firestore*.mjs` probes write to production Firestore).

> **DECISION D1** — Options:
> **A. Move to `scripts/archive/`, untracked from CI paths** *(recommended)* — keeps history reconstructable at zero runtime cost; delete after 30 days.
> **B. Delete outright** — git history preserves them anyway; cleanest tree.
> **C. Keep in place** — no.

Also in this fix: rename the 7 manual `test-*.mjs` probes into `scripts/probes/` and add a README line stating they hit **live** services.

### F0.3 — Single lockfile + version stamp · Effort: S
Both `bun.lock` and `package-lock.json` are tracked; README says npm; the non-standard `"buildCommand"` field in package.json is dead config. Fix: delete `bun.lock`, delete the stray `buildCommand`, bump `version` from `0.0.0` to `0.1.0-beta` and adopt semver discipline (world-class apps are versioned; your error telemetry should report the version too — add it to the logger payload). No decision needed; do it.

### F0.4 — Regenerate and re-seal build artifacts · Effort: S
`api/_server.js` is committed by necessity (Vercel trace reliability) but nothing enforces regeneration. Fix: Vercel `buildCommand` (see F1.1) regenerates it on every deploy; add a CI check that fails if `git diff --exit-code api/_server.js` after a rebuild shows drift (artifact staleness gate).

---

## Phase 1 — Security hardening (blocks launch)

### F1.1 — Close the Vercel security bypass · Effort: M — **the single most important fix**
Today: `npm run build:server` bundles `server.ts` alone into `api/_server.js`; `security-entry.ts`'s monkey-patched auth/rate-limit wrapper never applies; Gemini routes themselves declare no `authenticateUser`. Production (Vercel) serves open AI endpoints.

> **DECISION D2** — Options:
> **A. Intrinsic route-level security** *(recommended)* — move auth + rate limiting + model allowlist + payload caps **into `server.ts` route declarations themselves** (middleware on each AI route), so every bundle is safe regardless of entry point. Keep `security-entry.ts` as defense-in-depth for the Node path. Also set `vercel.json` `buildCommand` = `npm run build && npm run build:server` so the artifact can't go stale.
> **B. Fix the build only** — make `build:server` bundle `security-entry.ts` instead of `server.ts`. Minimal diff, but security stays implicit in entry choice — the exact trap that caused this. One future script mistake reopens the hole.
> **C. Migrate API to Vercel-native (edge/serverless functions per route)** — cleanest long-term topology, but a rewrite; not now (log as v2 direction).

Logic: security must be a property of the route, not of which file got bundled. A is an afternoon of work that eliminates the class of bug, not the instance.

### F1.2 — Fail-fast credential boot · Effort: S
`server.ts` currently initializes Firebase Admin without service-account creds and 401s at request time. Fix: on boot, require `FIREBASE_SERVICE_ACCOUNT` when `NODE_ENV=production`; log a structured startup banner listing every credential check (Gemini key present, service account parsed, sqlite/Firestore mode); exit non-zero on failure. Vercel surfaces boot failures as failed deploys — that's the behavior you want.

### F1.3 — Fix OAuth `state` forgery · Effort: M
Google/TikTok callbacks treat `state` as the userId — anyone can link *their* platform tokens to *your* account. Fix: issue `state = uid HMAC-signed, timestamped, single-use` (crypto HMAC or a signed JWT with `aud=oauth`, 10-min TTL, jti stored in Firestore for replay rejection); verify signature + expiry + jti on callback before honoring `uid`. Applies to both `/api/auth/google/callback` and `/api/auth/tiktok/callback`.

### F1.4 — Encrypt platform tokens at rest · Effort: M
YouTube/TikTok OAuth tokens sit plaintext in `user_accounts`. Fix: AES-256-GCM envelope encryption with a `TOKEN_ENCRYPTION_KEY` env secret; store `{ciphertext, iv, tag, keyVersion}`; decrypt only in the publish/analytics call paths. Add a one-time migration for existing rows. (If D3 lands first, tokens move to Firestore — encrypt there; the schema travels.)

### F1.5 — Close wrapper coverage gaps & tighten limits · Effort: S
Even on the protected Node path, `/api/gemini/generate-image` and `/api/onboarding/niche-sparks` fall outside the wrapper's 5 guarded paths. In the route-level model (D2-A) these simply get the same middleware. Also: extend the existing payload caps to **every** multer route, add a per-user daily token/quota ledger (Firestore doc per user-day) so even authenticated users can't run your Gemini bill to the moon, and return proper `429` with `retryAfter`.

### F1.6 — Firewall the small stuff · Effort: S
(a) Delete the `/test/{docId}` any-authenticated-readable Firestore rule (leftover). (b) Replace the hardcoded admin email (`danengelsman@gmail.com`, line 15 of rules) with a custom claim `admin: true` set via a one-off script — mailbox compromise should not equal super-admin. (c) Remove the `?debug=` stack-trace leak from `api/index.js`. (d) Set restrictive CORS on the API (same-origin + your Vercel domains). (e) Add security headers via `vercel.json` (CSP, HSTS, X-Frame-Options DENY, Referrer-Policy). No decision; all are unambiguous.

### F1.7 — Client-side 401/429 handling · Effort: S
Unify `apiFetch` / `authorizedFetch` / bare `fetch` (`ContentStudio.tsx:106`) into **one** authenticated client that always attaches the Firebase token, handles `401` (refresh once, then bounce to login) and `429` (surface "rate limited, retry in Ns" in the UI). This is also where the Gemini response contracts (F4.6) plug in. No decision; the helper divergence is a standing bug factory.

---

## Phase 2 — Data layer convergence (the split-brain must die)

Four stacks exist (sqlite live-but-ephemeral, pg+drizzle dead, firebase-admin verify-only, Firestore client-side). Firestore is the modeled system of record (`firebase-blueprint.json`).

> **DECISION D3** — Options:
> **A. Firestore-only** *(recommended)* — server reads/writes Firestore via firebase-admin; delete `src/db.ts` (sqlite), delete `src/db/` (pg/drizzle scaffolding) and the `pg`, `better-sqlite3`, `drizzle-orm` deps. Zero-infra, matches client, survives serverless. Cost: queries are Firestore-shaped (no joins); analytics aggregations need care.
> **B. Real server DB (managed Postgres, e.g. Neon/Supabase)** — server becomes the single source of truth; client migrates off Firestore for app data (keep Auth). Stronger relational guarantees, better for the analytics/roadmap ambitions; but it's a client+server migration (~2–3× effort of A) and adds a paid dependency + connection management on serverless.
> **C. Status quo** — unacceptable for production: silent cross-invocation data loss on Vercel.

My logic: you're pre-launch with modest data volume and a client already built entirely around Firestore snapshots; A converges in days, B is a re-platform. Choose B only if you know you need relational/aggregate power soon (leaderboards, complex reports) — and even then, A now, B later behind the repository layer.

Sub-fixes (either option):
- **F2.1** Introduce a thin server-side repository module (`src/server/repositories/*`) so route handlers never touch a DB SDK directly — this is what makes a future A→B migration cheap.
- **F2.2** Move OAuth token storage to the converged store (encrypted per F1.4).
- **F2.3** Migration + verification script: enumerate sqlite rows, upsert to Firestore, checksum-count per table, write a one-page migration report; keep sqlite read-only for one release before deletion.
- **F2.4** Delete `/tmp`-sqlite path entirely; add a boot assertion that fails if the ephemeral path would be used in production.

---

## Phase 3 — Fabricated-data honesty (trust is the product)

Policy decision first:

> **DECISION D4** — Options:
> **A. Remove or feature-gate all fiction** *(recommended)* — anything not real is deleted from the UI or hidden behind a `VITE_FEATURE_*` flag until real. Public launch shows only truth.
> **B. "Demo data" labeling** — keep fakes, badge them clearly ("Sample data"). Faster to ship, but world-class products don't ship fake leaderboards; also weakest legally.
> **C. Build everything real before launch** — max honesty, max time-to-launch; conflicts with shipping.

Fixes under policy A:
- **F3.1 JSON-LD fabrication (legal exposure)** — `index.html` ships `aggregateRating 4.9 / reviewCount 15,200` for an unreviewed product. Remove the rating block outright (Google can penalize fabricated review markup; FTC-style exposure is real). Also replace placeholder domains `creatoros.com/.app` in canonical/SEO tags with the real deployed domain. Effort: S.
- **F3.2 TikTok analytics constants** — `followers: 1240, views: 45e3, likes: 8900` returned for any connected account. Replace with an honest state: TikTok display-only connection now, metrics panel reads "TikTok analytics unavailable — TikTok requires audit approval for data access" until the real API is approved (see F6.3). Effort: S.
- **F3.3 Community facade** — hardcoded leaderboard with picsum avatars, fake "1,204 Active", input with no handler. Gate behind flag (default off) and rename nav entry "Community (soon)" — or go straight to F6.1 if you fund it now. Effort: S.
- **F3.4 SupportHub fake test log** — the scripted "PASS (0 security vulnerabilities)" playback must go; replace with real build/commit metadata display (version from F0.3, deploy date, real links to CI runs via GitHub API). Effort: S.
- **F3.5 Reports demo constant** — delete `DEMO_PROJECTS` in `Reports.tsx`; keep the honest empty states you already have. Effort: S.
- **F3.6 Marketing-site parity** — LandingPage (1,155 LOC) claims audit: every number/testimonial/feature claim on it either becomes true, becomes "planned", or disappears. Effort: M.

---

## Phase 4 — The safety net (CI, tests, quality gates)

> **DECISION D5 (test depth)** — Options:
> **A. Smoke-gate now, expand later** *(recommended)* — CI runs typecheck + repaired ESLint + build + the existing Video Studio smoke e2e against **Firebase Emulator + mocked Gemini** (no live services in CI) on every PR; unit coverage target set only on the services layer (60%).
> **B. Full matrix now** — all 4 Playwright browser projects + coverage gates everywhere. Slower CI (~15+ min), high maintenance while the UI churns; premature pre-launch.

Fixes:
- **F4.1 Real CI** — replace the heartbeat workflow: PR pipeline = install (npm ci, single lockfile) → typecheck → ESLint → Prettier check → build → unit tests → e2e smoke; `main` additionally runs the deploy-staleness check (F0.4) and uploads Playwright traces on failure. Add a branch-protection rule: PR required, status checks required. Effort: M.
- **F4.2 Repair or remove ESLint** — currently `npx eslint .` exits 1 with 109 errors (no Node globals, no TS parser, linting committed bundles; `lint` script never invokes it). Recommended: repair (flat config with `typescript-eslint`, `env.node` for server files, `ignores: [api/, dist/, scripts/archive/]`, `no-console` off for server), then wire into `lint` alongside tsc. If you'd rather not maintain it, delete the config and dep entirely — a dead linter is worse than none. *(Decision folded into D5: recommend repair.)* Effort: S–M.
- **F4.3 Formatting discipline** — Prettier + pre-commit via husky/lint-staged (format + eslint --fix + tsc --noEmit on staged files). Skip file-formatter wars: adopt repo-wide Prettier defaults in one commit, exclude `api/_server.js`. Effort: S.
- **F4.4 Unit tests where bugs actually live** — Vitest; priority targets: Gemini response parsing (`services/gemini.ts` JSON contracts — heatmap, scene plan, brand kit), the unified API client (F1.7), retention scoring helpers, goal-rollover logic in `dailyGoals.ts`, server route auth middleware (with a mocked admin). Effort: M.
- **F4.5 E2E hygiene** — `smoke_tests.spec.ts` currently hits **live Firebase auth** and embeds a literal password. Move to Firebase Emulator Suite for auth/Firestore; mock `/api/gemini/*` (video route already mocked — extend the pattern); delete the literal password; fix `app.spec.ts`'s vacuous `if (count > 0)` assertions into real expectations or delete them. Effort: M.
- **F4.6 Contract validation on AI payloads** — zod schemas for every Gemini JSON shape, parsed at the boundary; invalid → logged + friendly retry. This kills the biggest runtime-risk class identified (untyped AI JSON against strict-off TS). Effort: M.
- **F4.7 Observability** — client logger currently writes errors into the same Firestore the app depends on, with one root ErrorBoundary. Recommend: keep lightweight error capture client-side but **sample + cap** writes, add per-route error boundaries (46 views!), and add server-side request logging with request-IDs. > **DECISION D6**: **A. Keep Firestore-backed logging** (zero new vendor; recommended pre-launch) vs **B. Sentry (or Axiom) free tier** (better ergonomics, alerts, release health; one more vendor + key). Either way: alerting on error-rate spikes via the chosen channel. Effort: S–M.

---

## Phase 5 — Frontend architecture (maintainability, pre-refactor debt)

- **F5.1 Router** — tabs are ephemeral `pushState`; no deep links, broken back button. > **DECISION D7**: **A. Adopt TanStack Router** *(recommended: type-safe, file-optional, first-class search-param state — fits the 46-view registry)* vs **B. React Router** (bigger ecosystem, more boilerplate) vs **C. Keep hand-rolled but make tabs URL-synced** (cheapest — sync `activeTab` ↔ `?tab=` + `popstate`, ~half day; defers real routing). Effort: M (A/B) / S (C).
- **F5.2 State management** — 13 root `useState`, props drilled 14 deep, every Firestore snapshot re-renders the tree. > **DECISION D8**: **A. Zustand slices per domain** (projects/brand/user) *(recommended: minimal API, works fine alongside Firestore snapshots)* vs **B. Split Contexts** (no new dep, but re-render control is coarser) vs **C. Only memoize** (`React.memo`/`useMemo` at hot spots; cheapest, doesn't fix prop drilling). Effort: M.
- **F5.3 TypeScript strict, incrementally** — enable `strict` (at minimum `strictNullChecks` + `noImplicitAny`) repo-wide, then fix; expedient path: `"strict"` now that AI payloads are zod-guarded (F4.6) — the `157 any`s shrink naturally as contracts land. Also fix the `@/*` alias mismatch (tsconfig says repo root, Vite says `src`). Effort: M–L.
- **F5.4 Split the monoliths** — `CalendarView` (1,468 LOC) and `LandingPage` (1,155 LOC) into feature folders with co-located tests; the scripted decomposition of ContentStudio (F0.2's evidence) shows the pattern works — continue it deliberately, not by regex surgery. Effort: M each.
- **F5.5 Observer & render hygiene** — consolidate 3 root `onSnapshot` listeners behind the store (F5.2), add an ErrorBoundary per route, remove the duplicate CSS import path (`index.html` link vs main.tsx import), self-host or `font-display: swap` the Google Fonts import, remove the dead `genai` manual-chunk rule. Effort: S each, bundle as one fix.
- **F5.6 Bundle discipline** — lower `chunkSizeWarningLimit` from 1500 back to default and act on the warnings; add `rollup-plugin-visualizer` in CI as an artifact. Effort: S.

---

## Phase 6 — Product completion (the "grow/connect" layer)

These are scoped *build* decisions — the strategy call is yours:

> **DECISION D9** — What does "launch" include?
> **A. Create-focused launch** *(recommended)* — ship Phases 1–5 + honest gating of the growth layer (D4-A). Position: "the AI creation studio for creators." Community/billing/analytics arrive as updates. Fastest honest path to public.
> **B. Full-suite launch** — also build F6.1–F6.4 below before opening the doors (~3–5 additional weeks).
> **C. Private beta first** — everything in A, behind invite codes, with a feedback loop; promote to public after 2 stable weeks.

Growth-layer fixes when funded:
- **F6.1 Real Community** — Firestore-backed posts/likes, presence via `onDisconnect`, leaderboard from real aggregate stats (requires Firestore rules design + moderation plan; rule of thumb: don't launch UGC without report/block buttons). Effort: L.
- **F6.2 Billing** — > **DECISION D10**: **A. Stripe + Checkout** (cards, the default) vs **B. Lemon Squeezy/Paddle** (merchant-of-record, handles global tax for you — attractive for a solo operation) vs **C. Defer** (recommended pairing with D9-A/C). Wire plan → feature flags; the hardcoded "Free Plan" label in `Profile.tsx` becomes real. Effort: L.
- **F6.3 TikTok analytics for real** — TikTok's display API requires developer-app approval (audit); start the application now if this matters (lead time is weeks–months). Until approved, F3.2's honest state stands. Effort: M code / L process.
- **F6.4 Roadmap from real data** — replace `completedDays=[1]` with actual mission/streak completion from the converged store; it's the natural showcase for F2.1's repository. Effort: S–M.
- **F6.5 Environments & release process** — separate Vercel **preview** (per-PR, automatic) + **staging** Firebase project (separate Firestore!) + production project; version stamp + release notes in SupportHub (F3.4); a 5-line DEPLOY runbook. Never test Firestore rules against prod again. Effort: M.

---

## Sequencing (critical path)

```
Week 1:  F1.1  F1.2  F1.6  F0.3  F0.4        ← deploy path stops being dangerous
         F0.1  F0.2 (parallel, trivial)
Week 2:  F1.3  F1.4  F1.5  F1.7  F2.x (D3-A) ← security complete, data converges
Week 3:  F3.x (D4-A)  F4.1  F4.2  F4.3      ← honest UI, real CI gates live
Week 4:  F4.4  F4.5  F4.6  F4.7  F0.1-close ← safety net done, backup bundle retired
Week 5+: F5.x  (D7/D8 choices)               ← architecture while stable
Later:   F6.x per D9                          ← growth layer as funded features
```

Gates: **end of week 2** = security+data audit passes (fresh unauth probes against prod `/api/gemini/*` must 401; no `/tmp` writes). **End of week 4** = CI red/green decides merges; fabricated-data grep across `src/` + `index.html` returns zero. **End of week 5** = strict TS + deep-linkable tabs.

## Definition of done (production bar)

- [ ] Unauthenticated `POST /api/gemini/*` from the deployed URL → **401**; authenticated → works; 429 after quota
- [ ] No server write path touches ephemeral storage; data survives a cold Vercel invocation (verified by test)
- [ ] OAuth linking cannot be forged (state signature + replay tests)
- [ ] Every token at rest encrypted; keys only in env/secret manager
- [ ] Zero fabricated data reachable in the product (grep-gated)
- [ ] PR pipeline: typecheck + lint + format + build + unit + emulator e2e, all required checks
- [ ] `tsc` strict; zod contracts on every AI boundary; unified authenticated client
- [ ] Staging project exists; production deploys only via CI; version visible in-app
- [ ] Error monitoring with alerting; boot fail-fast on missing secrets

## What I would deliberately NOT do now

No Next.js/refactor of the hosting model (C in D2 — log as v2), no Redux/Zustand-everywhere rewrite (store only what hurts per F5.2), no micro-frontend or monorepo split (one app, two authors), no i18n, no design-system extraction beyond the existing `ui/` primitives, and no new AI features until F1.1/F2 land — every new feature on the current deploy path deepens the security and data debt.

---

## Decision summary (11 forks)

| ID | Question | Recommended |
|---|---|---|
| D0 | Vercel bot branch w/ old lineage | **A — rebuild on new history** (then delete backup bundle after 2 stable weeks) |
| D1 | 14 dead root scripts | **A — archive to `scripts/archive/`, delete after 30 days** |
| D2 | Close Vercel security bypass | **A — intrinsic route-level security + real buildCommand** |
| D3 | Data layer convergence | **A — Firestore-only** (+repository layer for future B) |
| D4 | Fabricated-data policy | **A — remove or feature-gate all fiction** |
| D5 | Test depth | **A — smoke-gate now (emulator-based), expand later** |
| D6 | Error observability | **A — Firestore logging pre-launch** (Sentry post-launch is fine) |
| D7 | Router | **A — TanStack Router** (C is the cheap fallback) |
| D8 | State management | **A — Zustand slices per domain** (C as fallback) |
| D9 | Launch scope | **A — create-focused public launch** (C private beta if cautious) |
| D10 | Billing vendor | **C — defer** (pair with D9; Stripe when needed, L Squeezy for solo tax handling) |

*Defaults are coherent as a set: they get you to an honest, secure, tested public launch in ~4–5 weeks with the smallest reversible steps, and every default keeps a future upgrade path (D3→B, D6→B, D9→B) open rather than closed.*
