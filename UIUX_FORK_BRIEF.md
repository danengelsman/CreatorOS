# CreatorOS — UI/UX Fork Brief

**Created:** 2026-10-04 · **Purpose:** seed document for the UI/UX design discussion fork. Read alongside `PRODUCTION_READINESS_PLAN.md` (phases F3/F5, decisions D7/D8/D9) and `APP_EVALUATION.md` (§7 frontend findings).

## What the code tells us about the current UI (audited facts)

- **46 views**, all lazily loaded; nav registry `NAV_ITEMS`/`NAV_GROUPS` at `App.tsx:68–98`; some entries nav-locked (Creator Hub `locked: true`, gate at `App.tsx:479,488`)
- **Navigation:** hand-rolled `pushState` + in-memory `activeTab` — tabs are not URLs: no deep links, no shareable views, back button doesn't restore state
- **Stack:** Tailwind CSS 4 (`@tailwindcss/vite`), motion (framer-motion 12), Phosphor icons (duotone; bulk-migrated from lucide on 2026-09-20), recharts for charts
- **Design-system maturity: low.** Only 2 shared `ui/` primitives against 44 feature components; no dedicated design-tokens file reported (audit needed); 21 hardcoded http(s) URLs in the frontend tree
- **Monolith screens:** `CalendarView` 1,468 LOC · `LandingPage` 1,155 LOC; `ContentStudio` partially decomposed (ContentEditorView + AIToolPanel were extracted — by regex scripts, not design-led refactor)
- **States:** honest loading/empty states in Dashboard ("Connect to activate"); single root ErrorBoundary (any view crash blanks the app)
- **Hygiene debt that touches visuals:** render-blocking Google Fonts `@import` (`index.css:1`); duplicate CSS import (`index.html` link + `main.tsx` import); `chunkSizeWarningLimit: 1500` masking bundle bloat
- **Fabricated UI pending removal (per D4-A):** Community leaderboard/feed literals (picsum avatars, "1,204 Active"), fake JSON-LD ratings in `index.html`, hardcoded TikTok stats, SupportHub scripted "test PASS" log

## Where UI/UX decisions intersect the plan of record

| Plan item | Interface with design |
|---|---|
| **D7-A TanStack Router** | URL design *is* UX design — define the URL space (tabs as paths vs search params, shareable deep links, back semantics) before implementation |
| **D8-A Zustand slices** | Store boundaries should follow UX domains (projects / brand / user) — settle information architecture first, then slice |
| **F3.x honesty pass** | Removing fakes changes the nav map and empty states — design one "coming soon" pattern and apply it everywhere |
| **D9-A create-focused launch** | IA should foreground the 8 real create tools; the growth layer recedes into gated/coming-soon |
| **F5.4/F5.5** | Splitting CalendarView/LandingPage and font/CSS hygiene are the implementation side of any redesign — sequence redesign before or with the split, not after |

## Open design questions for the fork

1. **Information architecture:** 46 views → how many nav groups? Current grouping exists (`App.tsx:68–98`) — audit against the creator mental model (Create → Grow → Monetize?)
2. **Design tokens:** formalize a Tailwind 4 theme (color/type/spacing/radius) as single source of truth; dark-mode status not audited — check and decide
3. **Onboarding journey:** `Onboarding` 679 LOC + niche sparks — is first-run coherent end-to-end, from signup to first generated artifact?
4. **Landing page:** 1,155-LOC marketing surface carrying fabricated claims — redesign alongside the F3.6 truth pass?
5. **Locked-feature pattern:** what should users see when something isn't launched? (One reusable pattern: label, waitlist CTA, or hidden?)
6. **Component library:** which of the 44 feature components hide reusable primitives worth extracting?

## How to start the forked conversation

> *"Read `UIUX_FORK_BRIEF.md`, `APP_EVALUATION.md` §7, and `PRODUCTION_READINESS_PLAN.md` (F3, F5, D7–D9) — then let's work on [your topic]."*

Ask for visual work or prototypes explicitly — the design agent should load its design skill entry point (design-core-rules) before producing any HTML/prototype deliverables.
