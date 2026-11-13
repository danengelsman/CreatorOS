# CreatorOS — Project State & Handoff

**Updated:** 2026-11-13 · **Purpose:** lossless handoff for any fresh conversation. Read this plus `PRODUCTION_READINESS_PLAN.md` before doing anything.

## Current checkpoint — November 13, 2026 (ALL REPAIRS MERGED & DEPLOYED)

- **Verified baseline:** remote main is `f557466` (PR #33 Calendar merged). All prior releases complete: Studio closeout #28/#29, Google redirect errors #30, video Phase 0 contracts #31, Zustand/focus slices #32, Selector stability #35, 3D mockup alignment #23, Telemetry nav fix #25, Founder footer #27.
- **Baseline checks:** main CI run `43340216846` passed typecheck, lint, build, artifact freshness, formatting, unit tests, Chromium E2E, and 4 actual-rules tests. The general UI suite is not production authorization or provider evidence.
- **Firestore rules DEPLOYED (2026-11-13):** Reserved-brand-ID rule fix (`c6977b9` / `84204ac`) deployed to BOTH databases (`(default)` and `ai-studio-0a8878a6-d050-428c-9f54-98a4c21ce712`) via `firebase deploy --only firestore:rules`. Compilation and dry-run verified for both targets.
- **Production deployment VERIFIED:** Vercel deployment `7753911450` at exact `f557466` serves stable domain `creator-os-delta-lilac.vercel.app`. Probes: GET `/` → 200, GET `/studio` → 200, POST `/api/gemini/generate` (unauth) → 401, POST `/api/gemini/generate` (forged Bearer) → 401. Auth gate and request-ID middleware operational.
- **All repair waves COMPLETE:** Selector PR #35 (`0e2d3fd`), Calendar PR #33 (`f557466`), Telemetry PR #25 (`06bb28f`), Studio recovery (integrated in main via fast-forward), reserved-brand-ID rules deployed. No open PRs with unresolved findings.
- **Outstanding (not blocking launch):** Branch protection rule on main (Dan-level repo setting), 60% services coverage not measured (@vitest/coverage-v8 deferred), full TypeScript strictness (only `strictNullChecks` enabled), staging environment, monitoring/alerting, authenticated production persistence/provider/device verification, iOS Safari, durable video export. These are Phase 6+ items per plan of record.

## Historical checkpoint — Studio released; reviewed closeout PR #29

- **Merged:** Studio PR #28 as `cda0108`, then documentation PR #15 as `8db7f83`. Remote `main` was independently fetched and inspected on November 4. Do not recreate or re-merge the Studio release branch.
- **Production:** Vercel `creator-os`, deployment `dpl_DmLKAtQgCSSJ7YGFdyxZKitA6KXt`, reports READY, Production, source `8db7f83`, with the stable domain `creator-os-delta-lilac.vercel.app` assigned. HTTP probes of `/`, `/login`, `/studio`, `/studio/release-check`, and `/roadmap` returned 200 and the same entry asset; the asset returned 200. These are hosting/deep-link fallback checks, not authenticated browser journeys.
- **API gate:** missing and forged Bearer credentials on `POST /api/gemini/generate` returned 401 with the expected JSON errors and request IDs. No authenticated provider call or paid render was performed.
- **CI at `8db7f83`:** quality job passed, including 290 unit tests across 32 files; Chromium E2E passed 106 with 2 skipped. The general E2E emulator log explicitly defaults to allow-all rules because it does not consume the multi-database rules configuration: this is UI/integration evidence, not production-rule authorization evidence.
- **Formatting:** CI reported 90 unformatted files in its non-blocking Prettier job. The initial 90-file formatter pass matched configured formatter output from each HEAD blob. Independent review additionally confirmed equivalent structure and unchanged template/string/regex values for all 89 code/test/style files; `PROJECT_STATE.md` also contains intentional manual checkpoint edits. `prettier --check .` passed locally before the added CI job; the final workflow and checkpoint files also pass. Clean remote release gates remain required before merge.
- **Verification fallback and result:** local full TypeScript and ESLint checks timed out without diagnostics; the cached Java emulator also timed out. These are not passing gates. Clean Linux CI run `41873823184` on reviewed closeout source `1fafaaa` passed typecheck, ESLint, build, artifact freshness, 290 unit tests in 32 files, formatting, and Chromium UI E2E (106 passed, 2 skipped). The new isolated actual-rules job passed all 4 tests, 0 failures, using JDK 21 and the single-database demo config. Final documentation-only updates must also pass PR CI before merge.
- **Rules DEPLOYED and independently read back (2026-11-04 17:22 UTC):** the only live-to-repo difference was the previously approved reserved-brand-ID create restriction (`84204ac`, integrated as `c6977b9`). Both targets passed the production CLI dry-run; after the clean CI rule gate, the parent deployed `firestore:rules` to BOTH `(default)` and the named application database. Separate exact release GET → ruleset source GET → repeat release GET verified stable releases and byte-for-byte equality with the intended working file for both databases. Normalized source SHA-256: `8de9b4208ac6d707b4ffc0eeaba16d6e77586ee11d424b6acbdf20e88aaec279`. Private rollback snapshots remain preserved outside scratch. This proves deployed source identity, not a production user write/read roundtrip.
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

## Completed — Project-centric Studio (MERGED & DEPLOYED 2026-11-13)

- All Studio recovery work integrated into main via fast-forward from `repair/release-wave-20261112` → `f557466`. The `feat/project-centric-workspace` branch was ahead by only 1 commit (`a985244` — auth logout hardening) which is now included in main.
- **Core fixes released:**
  - Owner-fenced writes (`fix/studio-owner-commit-fence`): atomic owner-bound writes for Studio and Calendar project mutations; malformed journey protection; 37 real-SDK/rules browser cases pass
  - Auth/onboarding/navigation recovery (`fix/studio-owner-api`): stale transaction reads fixed after A-B-A switches; realistic saved draft + login return recovery; onboarding guard fixes; Studio drafts and onboarding text preserved
  - Release audit findings addressed: StudioAssistants backdrop click-to-dismiss, restored Hub unschedule action, updated E2E smoke video locators & studioAccountJourney fixtures
- **All release gates passed:** Typecheck & Lint 0 errors, production build clean, artifact freshness verified, 290/290 unit tests pass, E2E 53/53 pass
- **Firestore rules deployed:** Reserved-brand-ID restriction (`c6977b9` / `84204ac`) active on BOTH production databases
- **Production verified:** Vercel deployment `7753911450` at exact `f557466` serving `creator-os-delta-lilac.vercel.app` with auth gate operational

## Historical next action — November 4 (superseded above)

1. Close out reviewed PR #29 (`chore/studio-release-closeout`): final documentation CI, merge, verify remote main and the new stable-domain Vercel release. Source commit `1fafaaa` already passed every CI check; approved rules are deployed and independently read back for both targets. Do not repeat the already merged PR #28 or blindly replay preserved primary-checkout patches.
2. F5.2 Zustand slices and F5.4 LandingPage/CalendarView decomposition already merged in PR #22 (`ca143fe`). Its PR labels the LandingPage split F5.3, but F5.3 in the plan of record means strict TypeScript: the actual config enables `strictNullChecks`, not full `strict`/`noImplicitAny`.
3. Assess remaining F5.3 strictness, F5.5 hygiene, F5.6 bundle discipline, and the staging/release/monitoring definition-of-done against current source before selecting the next implementation chunk.
4. Growth/community/billing, advanced auth, video-engine redesign, and native iOS remain outside this closeout. The recorded launch scope is create-focused and billing is deferred.
