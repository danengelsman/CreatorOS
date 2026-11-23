# CreatorOS Recovery and Next Steps Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task. Discover that skill before execution; if unavailable, use the existing delegate_task workflow with separate implementation and read-only review owners.

**Goal:** Finish and verify the work already started before expanding CreatorOS's video studio.

**Architecture:** Preserve the owner-generation workspace contract and the existing Studio. Repair independent PRs in their existing worktrees, integrate serially after exact-head review, then recover the remaining video Phase 0 changes. Treat durable media storage and real provider-backed export as a separately approved phase.

**Tech Stack:** React, TypeScript, Vite, TanStack Router, Zustand, Firebase/Firestore, Vitest, Playwright, GitHub Actions, Vercel.

---

## Scope of this turn

Planning and read-only inspection only. No implementation, push, merge, deployment, security changes, paid provider calls, or deletion was authorized by “how do we proceed from here.” This document is a recommendation, not an execution or release approval.

## Verified checkpoint — November 8, 2026, approximately 01:02 EST

- Fetched remote `main`: `d74c93d0723f867cf9dfb9416ac0dfa3b5dbd29a`.
- PR #30 Google redirect error surfacing and PR #31 video production contract/revision staleness are merged. These merge facts do not prove successful Google login or real video rendering.
- Main CI run `42421184568` reports success at `d74c93d`. No live production deployment was inspected in this turn.
- PR #32, Zustand slices/focus state: head `41d6f5bc31c3463030c8cb826c3862c1951eabc6`; all current checks pass. Automated no-findings review covered earlier `8dd4d97`, not the final head. Independent exact-head review remains required.
- PR #33, Calendar extraction: head `d2cf306421d3e3675b082dfd588810620c77ded6`; required quality job fails at Unit tests; formatting also fails but is not a branch-required check. Automated review flags canceled-event content leaking into a subsequent date and invalid server-render assertions. These findings must be reproduced and fixed, not dismissed as pre-existing.
- PR #34, telemetry: head `78e6beeed8612c4ecb82903a2f4066018473aeea`; quality and rules jobs pass, but required E2E fails. Logs show account-switch journey navigation timeouts/ERR_ABORTED, with 105 passed, 1 failed, 2 skipped. Cause is not established. Automated review flags case-sensitive project-status handling and missing scores being treated as measured zero.
- Branch protection requires `Typecheck, lint, build, artifact gate` and `E2E smoke (Firebase emulators + mocked APIs, chromium only)`. Passing Vercel previews alone is insufficient.
- Video truth and integration worktrees retain uncommitted source changes and untracked tests. They are not merged or currently verified.
- No live delegated agents or tracked background processes were present when checked.
- `PROJECT_STATE.md` on main is stale: it still asks to close already-merged PR #29. The November 7 Week 5 plan also reintroduces features that already existed in some form. Reconcile implementation, do not blindly repeat headings.
- Full TS `strict` is not enabled; `strictNullChecks` is enabled.

## Orchestration decided up front

### First wave — independent work in parallel

1. **Calendar recovery owner:** reuse `C:/Users/ADMIN/Documents/CreatorOS_wt_week5_calendar`, branch `feat/week5-calendar-split`; repair PR #33 only.
2. **Telemetry recovery owner:** reuse `C:/Users/ADMIN/Documents/CreatorOS_wt_week5_telemetry`, branch `feat/week5-telemetry-service`; repair PR #34 only.
3. **Independent read-only reviewer:** review exact PR #32 head `41d6f5b` for owner-token resets, stale async updates, session clearing, selector/export compatibility, duplicated slices and focus-state leakage. Do not assign another writer to its worktree during review.

Before dispatch, recheck worktree status, remote heads, and live ownership. The slices and telemetry worktrees currently show tracked modifications with no substantive `git diff --numstat`; preserve them and inspect normalization rather than resetting them.

Each implementation owner runs focused tests. One integration owner runs heavy full gates serially, avoiding competing full suites on the Windows host. Final independent review is pinned to each actual final SHA; an earlier review does not cover a changed head.

### Serial work

- Integrate reviewed store foundation first, then Calendar and telemetry one at a time.
- Test the combined tree after integration; do not treat separately passing branches as combined verification.
- Do not begin auth listener consolidation or repo-wide strictness while shared store/auth contracts are moving.
- Do not push or merge without explicit execution/release scope. Merging main normally triggers Vercel production deployment; “merge without deploy” cannot be promised under current automation.

## Task 1: Repair Calendar PR #33

**Files:**

- `src/components/calendar/EventCreationForm.tsx`
- `src/components/CalendarView.tsx`
- `tests/calendarViewSplit.test.ts`
- Other extracted panels only if a focused regression proves a defect.

**Steps:**

1. Reproduce cancel-after-typing, then open a different day; write a failing regression requiring cleared title/body while preserving the intended platform/status behavior.
2. Restore reset-on-open semantics without weakening owner guards or changing scheduling writes.
3. Repair rendered-month/year and empty-account SyncPanel assertions to match actual component behavior; use fixed dates rather than the current month.
4. Run `npx vitest run tests/calendarViewSplit.test.ts` and the focused regression. Confirm failure before fixing and pass after fixing.
5. Format touched files with the repository's existing Prettier configuration; run scoped ESLint.
6. Inspect the final diff, commit to the same PR branch, and—only after push authorization—update the existing PR and verify exact-head CI.

**Done:** no canceled-event leakage; passing unit tests, formatting, required CI, and independent final-head review.

## Task 2: Repair telemetry PR #34

**Files:**

- `src/services/telemetry.ts`
- `tests/telemetrySignals.test.ts`
- `tests/telemetry.test.ts`
- Inspect `src/components/studio/studioHubHelpers.ts` and existing status helpers for persisted conventions.
- Inspect `e2e/studioAccountJourney.spec.ts` and failure artifacts; edit only if evidence establishes a test defect.

**Steps:**

1. Add failing cases for persisted `Draft`/`Published` statuses, supported legacy casing, scheduled work, absent score, measured zero, non-finite score and actual stored score fields.
2. Normalize workflow status consistently; explicitly recognize published work instead of classifying every non-draft item as shipped.
3. Require a finite measured score for low-retention warnings. Unknown must remain unknown; do not invent confidence or performance claims.
4. Keep existing `calculateOneLever` consumers and Studio navigation compatible.
5. Run `npx vitest run tests/telemetrySignals.test.ts tests/telemetry.test.ts`.
6. Inspect account-switch trace/screenshots and rerun that case in isolation. Distinguish navigation readiness/flakiness from an actual account-isolation regression; do not merely raise timeouts or skip the case.
7. Commit and, once authorized, update the same PR; verify exact-head required checks and independent review.

**Done:** truthful status/score signals, passing account-switch gate, no weakened account-isolation assertions.

## Task 3: Review and integrate the current wave

**Files:** PR #32 store files and tests; combined PR #33/#34 files; `PROJECT_STATE.md`.

1. Independently review final PR #32 head, including both old compatibility exports and new slices; repair only reproduced findings.
2. Recheck current PR heads and required checks before each authorized merge; integrate #32 first, then #33/#34 serially.
3. Run `npm run lint`, `npm run test:unit`, `npm run build`, formatting and artifact freshness checks. Inspect artifact-check implementation before running because it may regenerate tracked artifacts; retain and assess both bundle and map.
4. Run isolated actual-rules tests and emulator-backed Chromium E2E, including create/save/reload, canceled Calendar event, account A→B→A and login deep-link recovery. Label mocked API coverage explicitly.
5. Update `PROJECT_STATE.md` in the active PR with exact SHAs, review coverage, passed/failed/skipped gates, remaining video edits and release status. Do not write private account identifiers into public docs.
6. If release is authorized, read back merged main, exact-source CI and the stable-domain Vercel deployment before claiming live success.

## Task 4: Recover and complete the remaining bounded video Phase 0 work

**Existing worktrees:**

- `CreatorOS_wt_video_truth` / `feat/video-phase0-truth`
- `CreatorOS_wt_video_integration` / `feat/video-phase0-integration`

**Files already changed:**

- `src/components/VideoAnalyzer.tsx`
- `e2e/studio-assistants.spec.ts`
- `tests/videoAnalyzerUpload.browser.mjs` (untracked)
- `src/components/ContentStudio.tsx`
- `src/components/ScenePlanner.tsx`
- `tests/studioFeedbackProvenance.test.ts` (untracked)

Preserve and inspect these edits before reuse. Recover one owner per worktree, reconcile against current main and the merged video contract, and do not recreate work blindly. These two streams may run in parallel after the current wave is stable.

**Acceptance:**

- Analyzer states the actual 50 MB backend limit and rejects oversize picker/drop inputs before upload; valid inputs and retry remain usable.
- Scores and scene plans identify their source script revision; later edits make prior output visibly stale without deleting it.
- A late async response cannot overwrite newer results or cross an owner generation.
- Focused tests, integrated gates and exact-head independent review pass.
- This is still not durable video persistence or a playable export. No paid provider or rules change belongs in this slice.

## Task 5: Reassess remaining architecture, then approve one real video vertical slice

Before further refactors, inspect the live source to distinguish necessary work from duplicated November 7 plan items. Full strictness is a separate migration; listener consolidation needs a demonstrated lifecycle/ownership benefit, not merely fewer lines in AuthContext. Stage strictness after shared-file changes settle; preserve existing safety tests.

For a useful video milestone, target: **script → shot plan → one generated clip → durable saved asset → playable export after reopen**. Do not start the storage/provider implementation until these decisions are explicit:

- Provider/model and permitted commercial integration.
- Real-test spending cap and who pays for rendering.
- Media storage, retention, licensed inputs and output access controls.
- Separate approval for any security/rules/auth changes.

**Release evidence:** one bounded actual provider render, durable media bytes (not an expiring provider URL), reload/reopen, owner-isolated access, recoverable failed jobs and playable export. Builds and mocked tests cannot substitute for this evidence.

## Recommendation

Finish the open architecture PRs with their real regression fixes, complete the already-started video reliability work, and only then expand toward a real script-to-export workflow. Keep full strictness/staging/monitoring as explicit scoped follow-ups; do not allow unbounded refactoring to replace product verification.
