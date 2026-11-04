# CreatorOS — Project State & Handoff

**Updated:** 2026-11-04 · **Purpose:** lossless handoff for any fresh conversation. Read this plus `PRODUCTION_READINESS_PLAN.md` before doing anything. The current checkpoint below supersedes historical in-progress entries.

## Current checkpoint — Studio released; closeout in progress

- **Merged:** Studio PR #28 as `cda0108`, then documentation PR #15 as `8db7f83`. Remote `main` was independently fetched and inspected on November 4. Do not recreate or re-merge the Studio release branch.
- **Production:** Vercel `creator-os`, deployment `dpl_DmLKAtQgCSSJ7YGFdyxZKitA6KXt`, reports READY, Production, source `8db7f83`, with the stable domain `creator-os-delta-lilac.vercel.app` assigned. HTTP probes of `/`, `/login`, `/studio`, `/studio/release-check`, and `/roadmap` returned 200 and the same entry asset; the asset returned 200. These are hosting/deep-link fallback checks, not authenticated browser journeys.
- **API gate:** missing and forged Bearer credentials on `POST /api/gemini/generate` returned 401 with the expected JSON errors and request IDs. No authenticated provider call or paid render was performed.
- **CI at `8db7f83`:** quality job passed, including 290 unit tests across 32 files; Chromium E2E passed 106 with 2 skipped. The general E2E emulator log explicitly defaults to allow-all rules because it does not consume the multi-database rules configuration: this is UI/integration evidence, not production-rule authorization evidence.
- **Formatting:** CI reported 90 unformatted files in its non-blocking Prettier job. The initial 90-file formatter pass matched configured formatter output from each HEAD blob. Independent review additionally confirmed equivalent structure and unchanged template/string/regex values for all 89 code/test/style files; `PROJECT_STATE.md` also contains intentional manual checkpoint edits. `prettier --check .` passed locally before the added CI job; the final workflow and checkpoint files also pass. Clean remote release gates remain required before merge.
- **Verification fallback:** local full TypeScript and ESLint checks timed out without diagnostics; the cached Java emulator also timed out. These are not passing gates. The follow-up adds a separate `firestore-rules` CI job invoking existing `npm run test:rules` with JDK 21 and the single-database demo config, so the actual rules tests run independently of the allow-all UI suite. Clean Linux CI must pass before merge or the approved rules deployment.
- **Rules:** independent live readbacks of both databases match the pre-fix private rollback snapshots. Normalized live-to-repo diffs equal only the approved reserved-brand-ID create restriction (`84204ac`, integrated as `c6977b9`). That fix is still undeployed at this checkpoint; current live sources were independently reread by the parent. Do not infer that Vercel deployment also deployed Firestore rules.
- **Local work:** use `chore/studio-release-closeout` in the separate `CreatorOS_wt_release_closeout` worktree. The original checkout remains at `3683d67` with six uncommitted tracked paths plus unrelated untracked `docs/app_launch/` and `tsconfig.test.json`; preserve them and inspect their relationship to merged fixes before reuse. They are not part of the deployed artifact.
- **Leftover patch audit:** do not replay the old sign-out return-memory change, broadened URL parser, sentinel loosening, or superseded E2E edits over main. Independent offline review found that summary-only sentinel matching can discard substantive answers; the merged singleton-shape check remains unchanged. A separate remaining case exists when a signed-out user requests protected destination A and then B: the helper retains A. That regression is recorded for a separately scoped fix, not bundled with this formatting/verification closeout.
- **Remaining limits:** real Google sign-in roundtrip, authenticated live provider behavior, production persistence roundtrip, and iOS Safari are not reverified by these probes. Staging, strict TypeScript, monitoring/alerting, and other definition-of-done items must be assessed separately; this is not a blanket production-ready declaration.

## Repo state

- Canonical repository: `danengelsman/CreatorOS`, production branch `main`; latest verified remote checkpoint `8db7f83`. Active closeout worktree: `CreatorOS_wt_release_closeout`. The original `CreatorOS_Repo` checkout is behind with preserved local edits. Earlier sections retain historical SHAs.
- Git identity fixed (repo-local + global): `Daniel Engelsman <danengelsman@gmail.com>` — OpenClaw commits now attribute correctly
- History rewrite (2026-10-03): all 51 commits on `main` are Daniel as author+committer; content verified byte-identical (tree `b6bbdb47…`)
- **Safety backup:** `C:\Users\ADMIN\Documents\CreatorOS_Repo_backup_pre-rewrite_20261003.bundle` (full pre-rewrite history). Delete after ~2 stable weeks in production.
- Phase-3 work was done in a second worktree: `C:\Users\ADMIN\Documents\CreatorOS_wt_honesty` (branch `week3-fabricated-data`, squash-merged via PR #3)

## Open items

1. ~~**D0 / F0.1:** remote branch `vercel/install-vercel-speed-insights-k29xze`~~ **DONE 2026-10-04:** rebuilt on current main (cherry-picked bot commit, force-pushed). Old tip was `af7537a`; new tip `c4c151c` — branch history now 52 Daniel + 1 Vercel, no Mick lineage.
2. ~~Untracked in workspace: `APP_EVALUATION.md`, `PRODUCTION_READINESS_PLAN.md`, this file~~ **DONE 2026-10-04:** committed. `UIUX_FORK_BRIEF.md` intentionally left untracked (design decision pending). `.zwork/` + `.hermes/` gitignored.
3. **Admin claim DONE (2026-10-18):** Dan explicitly selected his primary Google sign-in account for `admin:true` in the CreatorOS Firebase project; independently read back via Firebase Admin SDK. Dan must sign out/in at the stable production URL to refresh his ID token; browser/rules access has not yet been verified. Other accounts were not elevated. The exact account and UID are in private project notes, not this public repo. Note: `set-admin-claim.ts` replaces _all_ custom claims, so future grants should merge existing claims instead.
4. `ARCHITECTURE.md` is tracked on main (earlier untracked note was stale).

## Week 1 executed (2026-10-04, commit `785c211`)

- **F1.1 DONE** — intrinsic route security in server.ts: `protectAIRoute` (auth + per-user/route rate limits + model allowlist + 50MB upload cap + googleapis URI allowlist) on all 7 AI routes. Verified live: unauth → 401, garbage token → 401, evil origin → 403.
- **F1.2 DONE** — production boot exits 1 on missing GEMINI_API_KEY / APP_URL / FIREBASE_SERVICE_ACCOUNT (verified). **Requires `FIREBASE_SERVICE_ACCOUNT` (base64 service-account JSON) in Vercel env vars — if the deployed API returns 500 "Server failed to start", that env var is missing.**
- **F1.6 DONE** — debug leak removed; /test rule deleted; admin = custom claim `admin:true`; CORS scoped to /api; security headers in vercel.json.
- **F0.3 DONE** — bun.lock deleted, version 0.1.0-beta, dead buildCommand removed.
- **F0.4 DONE** — `npm run check:artifact` gate works (verified stale→fresh cycle). Note: the gate diffs worktree vs index — it passes only after the regenerated `api/_server.js` is staged/committed.
- **F0.2 DONE** — dead scripts → scripts/archive/, probes → scripts/probes/ (README warns they hit live services), tsconfig excludes scripts/.
- **PREREQ for deploy:** Vercel env must include FIREBASE_SERVICE_ACCOUNT + GEMINI_API_KEY + APP_URL (fail-fast boot). google/TikTok client keys warn-only.

## Week 2 executed (commits `597b40f`…`348acb3`, merged to main 2026-10-05..10-12)

- **F1.3 DONE** — OAuth state HMAC: single-use, 10-min TTL, replay-rejected (`833817e`).
- **F1.4 DONE** — AES-256-GCM token encryption at rest with lazy re-encrypt on read, crash-guarded (`833817e`, `f25cb83`).
- **F1.5 DONE** — per-user daily AI quota ledger (Firestore `ai_quota`), 429 + retryAfter (`525d63d`).
- **F1.7 DONE** — unified authenticated API client: Bearer attach, one refresh-retry on 401, RateLimitError on 429, `creatoros:auth-expired` → forced sign-out (`597b40f`).
- **F2.x DONE (D3-A)** — persistence converged on Firestore via admin SDK; sqlite dropped; server-only rules for `integrations`/`ai_quota`; brand-completeness stat removed from summary (no honest server-side signal) (`2eb69cd`, `9040f63`, `c758d9e`).
- Video generation work landed on main: Replicate wan-2.2 / prunaai p-video engines, granular live progress, fail-fast on free-tier limits, `REPLICATE_VIDEO_MODEL` env-configurable.
- Env vars now expected in Vercel: `OAUTH_STATE_SECRET`, `TOKEN_ENCRYPTION_KEY` (added 2026-10-11, redeployed to snapshot).

## Week 3 executed (2026-10-12, PR #3, squash commit `9ef9683`, merge `5827564`)

- **F3.1 DONE** — fabricated JSON-LD `aggregateRating 4.9 / 15,200 reviews` removed from index.html; placeholder `creatoros.com/.app` replaced with the real deploy URL; fictional "CreatorOS Inc." author and 404 logo URL dropped.
- **F3.2 DONE** — fabricated TikTok metrics (`1240/45000/8900`) removed from server.ts. `GET /api/analytics/tiktok` now returns an honest unavailable state: `404 {available:false, reason:'not_connected'}` when no account, `200 {available:false, reason:'audit_pending', message:'TikTok analytics unavailable — TikTok requires audit approval for data access.'}` when connected. Summary keeps honest zeros. Reconnect TikTok analytics for real via F6.3.
- **F3.3 DONE** — Community gated behind `VITE_FEATURE_COMMUNITY=true` (default off): nav reads "Community (soon)", entry non-navigable (Creator Hub keeps its original unlock semantics: developer or users with content). Facade sample rows relabeled as sample data, picsum avatar URLs removed. Real community = F6.1.
- **F3.4 DONE** — SupportHub scripted "PASS (0 security vulnerabilities)" test-log playback deleted. Replaced with a real Build Information panel: package version + git SHA injected at build time via vite `define` (`__APP_VERSION__` / `__GIT_COMMIT__` bare globals — member expressions are NOT replaced by define), real links to repo / commit / deploy. "SQLite Handshake" card relabeled "Firestore Handshake". New files: `src/globals.d.ts`, `src/vite-env.d.ts` (repo had no Vite client types).
- **F3.5 DONE** — dead `DEMO_PROJECTS` deleted from Reports.tsx; honest empty states preserved.
- **F3.6 DONE** — LandingPage honesty pass: fake stats banner (15K+ creators / 1.2M+ scripts / 4.9 rating), three-tier pricing with monthly/yearly billing theater, fake "message sent" contact form, "All Systems Operational", placeholder social links, "Newest Version Live" pill, "Start Free Trial" CTA and "cancel your subscription" FAQ all replaced with honest early-access copy ($0, no billing exists) and real contact channels (mailto + GitHub issues).
- **Honesty sweep (same D4-A policy, beyond the six)** — Roadmap: hardcoded `currentDay=1` / `completedDays=[1]` / "1/30" ring now derive from real project count. Profile: Total Reach no longer adds fake TikTok reach (YouTube only); Content Score = real average of project `data.contentScore`; Streak from real dailyGoals store; "Your portfolio is live" card now says portfolios are not available yet; static ON Auto-Publish toggle now labeled "Planned". Integrations: honest per-platform descriptions; Instagram/X show "Coming Soon" instead of Connect buttons that actually fired TikTok OAuth; removed the saves-nothing "track anonymously" handle input and the "Passive Tracking" badge.
- **Verification (all green):** `tsc --noEmit` 0 errors; `npm run build` exit 0; `build:server` + `check:artifact` fresh; grep battery over src/ + index.html + server.ts + api/ + built dist/ finds zero fabricated strings (aggregateRating, TikTok constants, DEMO_PROJECTS, picsum, fake PASS strings, placeholder domains).
- **Deployed:** merged 2026-10-12; Vercel production deployment of `5827564` confirmed; unauth `POST /api/gemini/generate` on prod returns **401** (re-verified post-merge).

## Flagged for later (found during the Phase-3 sweep, not fixed)

- Reports "AI Insights" cards are static editorial text with no data behind them — wire to real data or reframe as generic tips.
- `summary.totalRevenue` / `revenueStreams` are heuristic projections (e.g. +$5 if followers>10, +$150 if ≥5000), not measured earnings — needs an API-shape decision.
- Non-functional controls: Reports "Export Intelligence PDF", Profile "Edit Account" (no handlers).

## Documents

- `APP_EVALUATION.md` — full diagnosis (features, security, data layer, tooling) with file:line evidence
- `PRODUCTION_READINESS_PLAN.md` — 31 fixes in 7 phases, efforts, sequencing, verification gates, definition of done

## Plan of record (recommended defaults; all forks reversible until executed)

D0-A rebuild bot branch · D1-A archive dead scripts · **D2-A intrinsic route-level security** · **D3-A Firestore-only data layer** · **D4-A remove/gate all fabricated data** · D5-A smoke-gate CI (emulators) · D6-A Firestore logging · D7-A TanStack Router · D8-A Zustand slices · **D9-A create-focused public launch** · D10-C defer billing

## Week 4 executed (2026-10-17/18, merged + deployed + CI green)

- **F4.1–F4.3 DONE** — real CI (typecheck, eslint, build, artifact gate, Vitest, e2e-smoke w/ emulators on JDK 21, Prettier non-blocking), ESLint flat config repaired (was 109 errors → 0), Prettier + husky pre-commit. Prebuilt on `week3-ci-gates`; merged `a358e4e` after resolving 5 files of baked-in conflict markers + 28 lint residues.
- **F4.4 DONE** — Vitest, 82→91 tests: gemini contracts, apiClient (401 refresh/429), dailyGoals rollover, server auth middleware (mocked admin, real Express on ephemeral port).
- **F4.5 DONE** — e2e on Firebase Emulator Suite (auth/firestore, UI off, JDK 21 pinned in CI); all /api mocked with catch-all fail-on-unmocked; live-contact tripwires; literal password deleted; emulator guards in src/firebase.ts (env-flag only). 4/4 chromium.
- **F4.6 DONE** — zod schemas for all 7 Gemini JSON shapes; `parseModelJson()` boundary in gemini.ts (fence-strip → safeParse → warn + friendly-retry).
- **F4.7 DONE (D6-A)** — request-ID middleware (X-Request-Id header, verified live in production 401s), client error-log gate (dedupe + 10/session cap + sampling, env-tunable), per-route RouteErrorBoundary with Go Home recovery. Zero new deps.
- **CI shakeout fixes (found by CI, not locally):** linux-only lockfile entries missing (fixed via temporary bootstrap `77371fe`, then restored strict `npm ci` @ `a824a2a`); ghost dep `typescript-eslint` declared (`67e0525`); e2e video locator scoped (`ab7c921`); JDK 21 pinned (`d0b74e3`).
- **Deployed:** `a824a2a..2777d1d` pushed; CI green on main (2m, strict npm ci); Vercel redeployed; production probes: unauth 401 + X-Request-Id present, forged 401.
- **Not done (flagged):** branch-protection rule on main (requires PR + status checks) — Dan-level repo setting, security-adjacent; 60% services coverage not measured (needs @vitest/coverage-v8, deferred); `git stash` in CreatorOS_wt_honesty holds ~92 files of pre-existing residue (recoverable, assessed redundant).

## Auth expansion Phase A MERGED + DEPLOYED (2026-10-18)

- PR #5 (`test-auth-e2e-harness`, squash `3cf2993`): onboarding handoff e2e coverage (the F4.5 gap) + email/password emulator harness helpers; 6 passed / 2 fixme-skipped; tripwires green.
- PR #6 (`feat-auth-phase-a`, squash `cb6ca28`): email/password sign-up/in/reset (enumeration-safe generic copy), password policy (8+ chars + bundled top-1000 common list, `src/lib/passwordPolicy.ts`), email verification banner (soft), remember-email, session cookies (POST /api/auth/session → admin createSessionCookie, 14d ABSOLUTE, httpOnly/secure/sameSite=lax; authenticateUser accepts cookie OR Bearer), POST /api/auth/revoke-all + "Sign out of all devices" UI, emulator projectId mirror fix (emulator-only), e2e auth-flows spec (4 new). Vitest 111/111, e2e 8/8. Merge conflict in e2e/test-user.ts resolved as union of both harnesses (parent-resolved; brace fix `37c3633`; session mock added to onboarding spec `ba09112`).
- Deployed `cb6ca28` to production; probes: GET / 200, forged session → 401, gemini unauth → 401. CI green on main push.
- **Phase B deferred until Dan enables Firebase Identity Platform** (his billing decision): TOTP MFA, breach-password screening, stricter enumeration settings. Free-tier Phase A uses a static common-password list instead.
- LoginScreen now offers Google + email/password. Emulator note: server admin mirrors the client's `demo-creatoros` projectId when emulator env is set (e2e-only path; prod untouched).

## PR #12 repair — router stabilization (2026-10-22/23, branch `fix/build-stability`)

Week 5 D7-A work landed here (file-based TanStack Router routes under `src/routes/`, `LayoutShell` shell, pathless `_auth` layout with `beforeLoad` auth guard, `_auth/*` children register at `/<name>` fullPaths). Post-merge of the initial commits, CI was red; three rounds of fixes (commits `646db09`, `f4fd655`, `fac34ce`, `b02afd3`, `e89d5cf`, `f2a4913`, `636a143`):

- **E2E regression 1 — verification banner during onboarding:** the Phase A banner lived in `LayoutShell`, but during onboarding the router isn't mounted (AppRoot renders only `<Onboarding>`), so the register test timed out. Fix: extracted `src/components/VerificationBanner.tsx`; rendered by LayoutShell (workspace) AND AppRoot (onboarding branch) — matches pre-router behavior (banner z-55 sits behind the onboarding modal z-200).
- **E2E regression 2 — stale nav locators:** drawer entries are router `<Link>`s now; `button:has-text("Create")`/`("Profile")` matched nothing. Fixed to `getByRole('link', { name, exact: true })` (exact match so "Creator Hub" ≠ "Create").
- **Signed-out transition gap:** `_auth` guard runs only on navigation; a mid-session sign-out (Profile → "Sign out of all devices" calls `auth.signOut()` with no navigate) stranded the user on a guarded route. Fix: RouterWrapper watches user→null and `router.navigate({ to: '/login' })`.
- **tsconfig:** `strictNullChecks: true` required by TanStack Router's type-check; `@/*` paths fixed to `./src/*` (matches Vite alias).
- **State:** `brand` (Firestore `projects/brand_<uid>` snapshot) moved into `workspaceStore` (Zustand), synced from AuthContext — routed views read it from the store, not props.
- **CI result:** Typecheck/lint/build/artifact-gate ✅, E2E smoke ✅ (19 tests, 1m53s), Vercel ✅. Prettier check still red (non-blocking by design until repo-wide format pass — not a required check). Vitest 125/125 locally. PR #12 MERGED to main (`251bb0b`). Stacked PR #13 format pass merged (`0f3bc9b`).
- **PR #14 auth redirect completion (2026-10-24, squash `ec920e3`):** AuthContext awaits `completeGoogleRedirect()` on startup before `onAuthStateChanged` attaches; `window.history.replaceState` normalizes path to `/` before redirect; `/` redirects authenticated users to `/dashboard`; catch-all SPA rewrite added to `vercel.json` (`/((?!api/|__).*)` -> `/index.html`). All CI jobs green (E2E smoke 2m45s); Vercel production deploy verified (GET /, /dashboard, /__/auth/handler 200, unauth API 401).
- Local e2e note: no JDK on this machine — Firestore emulator can't run locally; e2e verified via CI only.
- Dead code note: legacy `src/App.tsx` (old hand-rolled `activeTab` tab system) is no longer mounted by anything; candidate for deletion in a follow-up cleanup PR.

## PR #20 merged — Phase 5 cleanup & Gemini model audit (2026-10-25, squash `f691f14`)

- **Dead code deleted:** legacy `src/App.tsx` (790 LOC unmounted tab router) removed. Zero imports remained; router-native AppRoot is the sole entry.
- **Gemini model audit completed:** live query via `@google/genai` against Google AI Studio API verified all available models. Updated `ALLOWED_GEMINI_MODELS` in `server.ts` to include verified models (`gemini-3.7-flash`, `gemini-3.5-flash`, `gemini-3.1-pro-preview`, `gemini-flash-latest`, `gemini-2.5-pro`). Server bundle `api/_server.js` regenerated and freshness check confirmed.
- **CI results on PR #20:** all 4 checks passed (Typecheck/lint/build/artifact-gate, E2E smoke 19/19, Prettier check, Vercel preview).

## PR #23 merged — 3D product mockup UI alignment (2026-10-26, squash `da895b3`)

- **Persistent Desktop Sidebar:** Dedicated left sidebar on desktop (`lg:flex`) featuring the amber hexagon `BrandIcon`, CreatorOS wordmark (`FROM FIRST POST TO FIRST DOLLAR`), the 6 core workspace routes (Home, Create, Brand, Roadmap, Community, Reports) plus secondary studio tools and user account/logout controls.
- **Top Header Bar:** Updated header with "Your creator workspace" headline, "Demo workspace" badge, and profile avatar with online presence indicator.
- **"Make your next move" Hero Card (`Today.tsx`):** Aligned with the 3D concept shot featuring the "Make your next move" headline, "A clear next step. One task at a time" subtext, Step 1 of 3 badge, and an integrated 3-node connected roadmap track (Direction → Audience → Offer) while preserving all underlying First Dollar journey actions and tests.
- **Supporting Modules Grid (`Dashboard.tsx`):** Added 3-module grid for Content Studio, Brand Kit, and Your Roadmap directly beneath Today.
- **Spatial Depth Cards:** Added the AI Mentor card ("What should I work on next?") and compact Roadmap progress tracker.
- **Honest Demo Metrics:** Total Followers, Impressions, Engagement, and Revenue Estimate all cleanly formatted with honest empty states (`—`) rather than fake hype.
- **Palette Hygiene:** Purged lingering purple/cyan neon glows and gradients in favor of warm amber `#F4A261` and charcoal `#111216`.
- **CI results on PR #23:** All checks passed green (Typecheck, lint, build, artifact gate ✅, E2E smoke 12/12 ✅, Prettier check ✅, Vercel preview ✅).

## PR #25 merged — Telemetry signal navigation paths fix (2026-10-27, squash `06bb28f`)

- **Root cause:** `calculateOneLever` in `src/services/telemetry.ts` generated legacy navigation paths with a `/dashboard/` prefix (`/dashboard/brand`, `/dashboard/create`, `/dashboard/retention`, `/dashboard/repurpose`). Under the file-based TanStack Router architecture (`src/routes/`), authenticated routes live at the root under the pathless `_auth` layout (e.g., `/brand`, `/create`), while `/dashboard` is solely the Home view and has no child routes. Clicking "Act on Signal" triggered TanStack Router's root not-found component ("not found").
- **Fix:** updated signal action paths in `src/services/telemetry.ts` to `/<tab>` matching `routeTree.gen.ts` fullPaths (`/brand`, `/create`, `/retention`, `/repurpose`).
- **Tests added:** `tests/telemetry.test.ts` (5 unit tests covering each signal state and asserting that no paths start with `/dashboard/`). Total Vitest suite now 138/138 passing across 12 files.
- **CI results on PR #25:** all 5 checks passed green (Typecheck, lint, build, artifact gate ✅, E2E smoke 12/12 ✅, Prettier check ✅, Vercel preview ✅). Squashed and merged to `main`.

## In progress — Project-centric Studio (local only)

- Branch `feat/project-centric-workspace`, based on `4f9c5b9`. Work is not complete, verified, pushed, or deployed. Existing untracked `docs/` and `tsconfig.test.json` are unrelated and must be preserved.
- Separate local worktrees `CreatorOS_wt_studio_hub`, `CreatorOS_wt_studio_canvas`, and `CreatorOS_wt_studio_drawers` hold the parallel implementation.
  - Hub: `0066aac`, clean; API cancellation and publication-state fixes await final review. Agent reports 48 focused tests; typecheck timed out.
  - Canvas: `b453837`, clean; stale snapshot and bounded-recovery fixes await final review. Agent reports browser harness, 149 unit tests, build and typecheck passed.
  - Drawer: `104d57f`, clean and independently reviewed; its patch is applied to the parent worktree. Parent component-harness run passed 40/40 desktop and mobile-emulated Chromium tests; neither live backend nor iOS Safari was tested.
  - Auth: `18bb468`, clean; onboarding answer persistence fixes await final review. Agent reports 7 real-UI mocked browser tests, 15 isolation tests, 140 unit tests, typecheck and lint passed. Onboarding requests still need owner binding at integration.
- Parent worktree has in-progress routing and navigation edits. The editor, hub, legacy links, journey recovery, status mapping, and owner-scoped deep links require integration and verification. The previous baseline unit run timed out in the server-auth setup: 121 passed and 19 skipped; lint also timed out. TypeScript passed on the old baseline, not the in-progress tree.
- Independent reviews of Canvas `3c87e67`, Hub `8c5c420`, and Auth `be74bab` found further stale-snapshot/storage growth, inconsistent published status/abort handling, and onboarding completion data races; additional fixes are underway. Account-owned brand and idea values still need an explicit owner-bound integration contract. The Hub's ambiguous-creation retry is safe within the same mounted instance but does not survive reload.
- Parent routing review found account-switch data isolation, signal inspector intent, unauthenticated deep-link resumption, and first-dollar/Ideas access need attention. Telemetry unit regressions passed 6/6 after fixing content selection and inspector parameters. SignalCard routing and the real route remain to be exercised end-to-end. Roadmap now links to the First Dollar dashboard.
- After the later interruption, Canvas, Hub and Auth edits were recovered and committed in their own clean worktrees. The reviewed Drawer patch is applied to the parent; the integrated application is not release-ready.
- Owner-bound store integration `50d39d9` received independent review. Its earlier partial integration left parent routes inconsistent; the later recovery update below supersedes that status.
- Recovery update: Hub `1642f05`, Canvas `35c105d`, Auth `ef28cfc` and owner-store `50d39d9` are integrated into the parent tree, including the owner-generation AuthContext and Studio route selectors. Onboarding's four request sites now call owner-guarded `apiFetch`; project creation, stage changes and canvas transaction reads check the captured account generation. Studio's video/score/format requests also receive the route's generation guard. Protected route destinations are preserved across login with same-origin validation. The integrated tree still needs independent review before release.
- Local checks: `tsc --noEmit --incremental false`, `eslint .`, `npm run build`, and `git diff --check` passed; `vitest run --maxWorkers=1` passed 238 tests in 25 files. `node tests/studioCanvas.browser.mjs` passed deterministic Firestore/AI doubles, including account-change save and draft retention. Studio assistant harness passed 40 desktop/mobile-emulated Chromium cases. Auth isolation harness had 33 passes and one test failure caused by an unresolved mock profile lookup; the corrected individual case passed. Onboarding mocked browser harness passed 16 cases.
- Real routes: Chromium emulator smoke passed create → canvas → save → reload and mocked video generation. A second Chromium emulator journey passed A → B → A, denied B access to A's project, restored A's saved script, and resumed an unauthenticated project URL with inspector query after login. Browser external requests were blocked and APIs mocked. Auth/Firestore emulator runs used cached Java 21 at `C:/Users/ADMIN/pwtmp/jre21/jdk-21.0.12.1+1-jre`. Firestore emulator reported no configured rules file and used allow-all; no production-rule validation was performed. Legacy URLs besides the tested Studio deep link, real provider calls, iOS Safari, and independent integration review remain unverified. Hub ambiguous-create retry still does not survive a remount. Preserve unrelated `docs/` and `tsconfig.test.json`.
- Release review of `1dcd072` found account-bound API/session revocation and remote-deletion draft recovery gaps; fixes are in progress. A real Auth/Firestore emulator gate loaded repository rules and passed 9 scenarios; name-limit fix `b8e36d9` needs a recovery-path correction before integration. Emulator uses default DB; deployed rules for named production DB remain unverified. An emulator reproduced brand-ID squatting under repository rules. Dan explicitly approved a narrow reserved-brand-ID rule change and deployment to BOTH production databases if tests pass; isolated implementation/testing is underway, production rules not yet changed. The artifact freshness check passed but regenerated `api/_server.js.map`; preserve and assess the modified map before staging. Nothing has been pushed, merged, or deployed.
- The approved reserved-brand-ID rule fix passed independent review and emulator tests; local commit `c6977b9` integrates `84204ac`. Parent independently re-ran actual-rules Firestore emulator tests: 4 passed, 0 failed. Both databases' live releases and rules sources were read back and independently verified; restricted local rollback snapshots are preserved outside scratch. Production `firestore:rules --dry-run` compiled successfully for both targets. No production rules have been deployed.
- Independently reviewed onboarding recovery `8487d87` found no blocking defect; its mocked Chromium UI suite passed 21 tests. Integrated as `2befb1c` and `6ffe1f8`; parent rerun timed out during test-bundle setup and must be rerun. Firestore transaction and real named-database authorization were not proven by the mocked UI suite.
- Remaining isolated work: draft recovery after storage failure, owner-bound Profile/API session handling (including same-second cookie revocation caveat), and confirmed navigation/account-switch issues. Independent review and combined tests are required before release.
- Isolated fixes now exist locally: Studio recovery `5b86429` + `ce84bf8` (route/canvas browser checks, typecheck and scoped lint reported passing with mocked IO); API/session `96ddc03` + `8dfca36` + `7ad1732` (focused checks passed but full test/typecheck timed out and E2E unrun); navigation `1deed50` (mocked Chromium and typecheck passed). These exact commits are under independent review and are not integrated. Navigation worktree retains unrelated untracked `.hermes-tmp.EIDl8I`; do not remove without approval.
- Studio recovery independent review blocked on legacy colon-containing uid/project session keys becoming inaccessible; old keys are ambiguous, so do not migrate or expose without proving ownership. Earlier wrong-type and unconfirmed-refresh fixes passed offline review; safe legacy handling is in progress.
- Navigation follow-ups `98da0d7` and `1b9bb0a` guard Today and both AppRoot First Dollar calls. Worker reports mocked browser/unit tests, typecheck and lint passed; independent review of exact final commits pending. Already-dispatched Firestore work cannot be recalled or guaranteed to retain A's credential.
- Session follow-up remains uncommitted; independent review found expired-session UX lacks recovery, unowned API calls can replay A payload using B token, and server source map was stale. Corrections in progress; no full account isolation claim.
- Hub retry `00fd87f` and selected-idea follow-up `64e335b` fix reproduced duplicate and receipt losses locally; worker reports route/Hub/store browser doubles, focused unit, typecheck and lint passed. Exact final commit under independent review; not integrated. Admin rules permit cross-owner project update, so no credential-fencing claim is justified for in-flight SDK operations.
- Correction: the workspace (`1dcd072`), reserved-ID rules (`c6977b9`), onboarding name recovery (`2befb1c`, `6ffe1f8`), Hub retry/receipt (`46fed0c`, `d047bb7`, `1967891`), and Studio draft recovery (`7b37133`, `10302f2`, `a8586a4`, `88b88a7`) are integrated locally. API/session and navigation remain isolated and must be reviewed and integrated. No deployment has occurred. Legacy colon-key drafts are preserved but cannot be automatically attributed or recovered; warning/manual analysis is not proof of recoverability.
- Integrated Studio route recovery and template roundtrip Chromium script passed on the combined branch with deterministic Firebase doubles; production Firestore authorization remains unverified by that script.
- Independent real-Firebase SDK review reproduced expired refresh signing out before recovery; reproduction remains uncommitted in auth worktree and fix remains open. Repository rules/browser SDK emulator confirmed an admin B can commit some A project updates; experimental atomic owner-only journey fence is uncommitted in `fix/studio-owner-commit-fence`, covers canvas/stage/scheduling but not Calendar publish, adds journey availability/contending writes. Independent product/safety review pending; do not treat as released or complete.
  Navigation `7932b62` adds onboarding account-generation guards; `eac5d96` repairs lint. Reviewer found stale AuthContext transaction retries and delayed restore overwriting interview input; correction in progress.
  Hub fixes passed independent review of exact source commits `54356c5`, `00fd87f`, `64e335b`. Parent combined-branch unit run had 11 passing tests but a separate Vitest fork did not start; isolated thread-pool rerun of that file passed 5/5. Parent combined-branch real route/Hub/store receipt browser script passed using a Firestore double. Full combined suite remains required. Strict Firestore SDK credential fencing remains unproven; admin rules permit cross-owner updates and do not guarantee against cross-account writes by themselves.
  2026-10-31 release recovery completed per Dan's explicit request. Three isolated workstreams finished:
  - ✅ Combined auth/onboarding/navigation recovery in `CreatorOS_wt_studio_owner_api` (commit b2b2b7c): fixed stale transaction reads, implemented realistic saved draft + login return recovery, updated auth-flows.spec.ts to use emulator host env vars, ensured spark-dismiss timer visibility, preserved Studio drafts and onboarding text; all e2e and unit tests pass (53/53 e2e, 7/7 unit).
  - ✅ Project-write fence compatibility/completeness in `CreatorOS_wt_owner_fence` (commit 06bb5eb): added atomic owner-fenced writes, missing journey handling, malformed/legacy journey protection; all unit tests pass (studioOwnerFence 7/7, calendarUnschedule 4/4, etc.); browser harness passes 37 real-SDK/rules cases; canvas harness passes.
  - ✅ Independent read-only release acceptance audit: found one functional release blocker (P1 - scheduled projects stranded without Calendar access), one UX acceptance gap (P2 - outer assistant backdrop does not dismiss drawer), and three E2E contract failures; provided prioritized findings and exact fixes; current experience inventory verified; combined verification path provided.
    Parent now owns serial integration, combined gates, exact-commit independent review, approved rules deployment and application release. The source navigation worktree remains read-only; unrelated files are preserved. Execution plan: `.hermes/plans/2026-10-31_studio-release-recovery.md`.
    - 2026-10-31 integration & verification complete:
      - Merged `fix/studio-owner-api` (b32e997) & `fix/studio-owner-commit-fence`
      - Addressed release audit findings: added StudioAssistants backdrop click-to-dismiss, restored Hub unschedule action, updated E2E smoke video locators & studioAccountJourney test fixtures (commit b21a118)
      - Passed all release gates:
        - Typecheck & Lint (`npm run lint` / `tsc --noEmit && eslint .`): 0 errors ✅
        - Production build (`npm run build`): clean bundle generated ✅
        - Artifact freshness (`npm run check:artifact`): api/_server.js fresh ✅
        - Unit tests (`npm run test:unit`): 32/32 test files passed, 290/290 tests passed ✅
    - Next: push release branch, open PR, verify required CI checks, deploy rules and Vercel release.

## Next action

1. Finish Studio release closeout on `chore/studio-release-closeout`: formatting/release gates, independent review, exact live rules reconciliation, and reviewed PR. Do not repeat the already merged PR #28.
2. F5.2 Zustand slices and F5.4 LandingPage/CalendarView decomposition already merged in PR #22 (`ca143fe`). Its PR labels the LandingPage split F5.3, but F5.3 in the plan of record means strict TypeScript: the actual config enables `strictNullChecks`, not full `strict`/`noImplicitAny`.
3. Assess remaining F5.3 strictness, F5.5 hygiene, F5.6 bundle discipline, and the staging/release/monitoring definition-of-done against current source before selecting the next implementation chunk.
4. Growth/community/billing, advanced auth, video-engine redesign, and native iOS remain outside this closeout. The recorded launch scope is create-focused and billing is deferred.
