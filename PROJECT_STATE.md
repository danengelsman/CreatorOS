# CreatorOS — Project State & Handoff

**Updated:** 2026-10-04 · **Purpose:** lossless handoff for any fresh conversation. Read this plus `PRODUCTION_READINESS_PLAN.md` before doing anything.

## Repo state
- Path: `C:\Users\ADMIN\Documents\CreatorOS_Repo` · branch `main` @ `dbcf30d` — clean, in sync with origin (`github.com/danengelsman/CreatorOS`)
- Git identity fixed (repo-local + global): `Daniel Engelsman <danengelsman@gmail.com>` — OpenClaw commits now attribute correctly
- History rewrite (2026-10-03): all 51 commits on `main` are Daniel as author+committer; content verified byte-identical (tree `b6bbdb47…`)
- **Safety backup:** `C:\Users\ADMIN\Documents\CreatorOS_Repo_backup_pre-rewrite_20261003.bundle` (full pre-rewrite history). Delete after ~2 stable weeks in production.

## Open items
1. ~~**D0 / F0.1:** remote branch `vercel/install-vercel-speed-insights-k29xze`~~ **DONE 2026-10-04:** rebuilt on current main (cherry-picked bot commit, force-pushed). Old tip was `af7537a`; new tip `c4c151c` — branch history now 52 Daniel + 1 Vercel, no Mick lineage.
2. ~~Untracked in workspace: `APP_EVALUATION.md`, `PRODUCTION_READINESS_PLAN.md`, this file~~ **DONE 2026-10-04:** committed. `UIUX_FORK_BRIEF.md` intentionally left untracked (design decision pending). `.zwork/` + `.hermes/` gitignored.

## Week 1 executed (2026-10-04, commit `785c211`)
- **F1.1 DONE** — intrinsic route security in server.ts: `protectAIRoute` (auth + per-user/route rate limits + model allowlist + 50MB upload cap + googleapis URI allowlist) on all 7 AI routes. Verified live: unauth → 401, garbage token → 401, evil origin → 403.
- **F1.2 DONE** — production boot exits 1 on missing GEMINI_API_KEY / APP_URL / FIREBASE_SERVICE_ACCOUNT (verified). **Requires `FIREBASE_SERVICE_ACCOUNT` (base64 service-account JSON) in Vercel env vars — if the deployed API returns 500 "Server failed to start", that env var is missing.**
- **F1.6 DONE** — debug leak removed; /test rule deleted; admin = custom claim `admin:true` (run `npx tsx scripts/set-admin-claim.ts <uid>` once, then Dan signs out/in); CORS scoped to /api; security headers in vercel.json.
- **F0.3 DONE** — bun.lock deleted, version 0.1.0-beta, dead buildCommand removed.
- **F0.4 DONE** — `npm run check:artifact` gate works (verified stale→fresh cycle).
- **F0.2 DONE** — dead scripts → scripts/archive/, probes → scripts/probes/ (README warns they hit live services), tsconfig excludes scripts/.
- **PREREQ for deploy:** Vercel env must include FIREBASE_SERVICE_ACCOUNT + GEMINI_API_KEY + APP_URL (fail-fast boot). google/TikTok client keys warn-only.
- **Admin claim migration pending:** firestore.rules now require `admin:true` claim — until Dan runs set-admin-claim.ts and re-logs-in, admin-gated Firestore paths (user delete, support ticket admin updates, app_logs read) deny for him.

## Documents
- `APP_EVALUATION.md` — full diagnosis (features, security, data layer, tooling) with file:line evidence
- `PRODUCTION_READINESS_PLAN.md` — 31 fixes in 7 phases, efforts, sequencing, verification gates, definition of done

## Plan of record (recommended defaults; all forks reversible until executed)
D0-A rebuild bot branch · D1-A archive dead scripts · **D2-A intrinsic route-level security** · **D3-A Firestore-only data layer** · **D4-A remove/gate all fabricated data** · D5-A smoke-gate CI (emulators) · D6-A Firestore logging · D7-A TanStack Router · D8-A Zustand slices · **D9-A create-focused public launch** · D10-C defer billing

## Next action
Say: *"Execute Week 2"* → F1.3 (OAuth state HMAC), F1.4 (token encryption at rest), F1.5 (coverage gaps + quota ledger), F1.7 (unified API client), F2.x (D3-A Firestore convergence). Gate: end-of-week-2 security+data audit (fresh unauth probes → 401; no /tmp writes).
Immediate post-deploy check: unauth `POST /api/gemini/generate` on https://creator-os-delta-lilac.vercel.app must return **401** (500 ⇒ add FIREBASE_SERVICE_ACCOUNT to Vercel env).
