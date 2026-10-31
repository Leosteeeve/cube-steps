# Webb Cubing Club Phase 2 refinement

> For agentic workers: use superpowers:executing-plans for inline implementation and one fresh whole-branch review.

**Goal:** Clarify the club's identity and learning progression while preserving the approved editorial design.
**Architecture:** Targeted edits to the existing homepage, shell navigation and styles; reuse all existing routes and persistence.
**Tech stack:** React, TypeScript, Vite, Vitest, Playwright.
**Spec:** The owner's October 31 Phase 2 brief in this chat; decisions and evidence are recorded in `docs/club-phase2-refinement-report.md`.

## Global constraints

- Preserve Bricolage Grotesque, Instrument Sans, IBM Plex Mono, paper/ink/green tokens, cube visualization and reveal behavior.
- Publish no invented club facts. Do not turn the historical audience estimate into a membership claim.
- Keep routes, local data schemas, engines, experimental status and accepted media unchanged.
- Work on `codex/club-phase2-refinement`, based on current `origin/main` (`0e8bdf4`). No new publication is requested in this brief.
- Save screenshots and verification output outside the checkout in `validation/club-phase2-refinement`.

## Review focus

Check that developing solvers reach real CFOP/Roux lessons, advanced practice is distinct from experiments, home tutorial targets remain useful, navigation has no misleading simultaneous active sections, links remain keyboard/touch accessible, and no club activity is presented as a verified event. Check narrow layouts, zoom reflow, stored progress and reduced-motion fallbacks. Do not review only the changed strings.

## Task 1: Refine identity, pathways and navigation

**Files:** `src/club/HomePage.tsx`, `home.css`, `ClubApp.tsx`, `components/ClubFooter.tsx`, `components/ClubHeader.tsx`; focused browser coverage in `e2e/club-phase2.spec.ts`, existing homepage assertions where their labels intentionally move.
**Interfaces:** Existing hash routes, `home.learn` guidance target, resume prop, SectionMenu active state. No new route or storage schema.

1. Capture the unmodified homepage and important tools at the required widths; audit actual route destinations and current state.
2. Add browser regressions for the developing solver's direct lesson choices and exclusive navigation active state. Run them against baseline and confirm the intended failures.
   Expected: missing direct CFOP/Roux pathway links; incorrect Learn highlight on practice routes.
3. Replace software-only club description with sourced identity plus explicit invitations to learn/share/practice. Explain the CubeSteps relationship. Keep missing meeting/contact content in the report.
4. Use three ruled, semantic pathway rows with genuine links: first solve; beginner CFOP/Roux lessons; recognition/CMLL practice. Keep experimental labs in a separate clearly labelled note. Move the basics action to the first row to remove a redundant hero lesson link, preserving its tutorial target.
5. Correct natural microcopy and the navigation active-state derivation. Adjust only spacing/measure necessary for the added choices.
6. Run focused browser tests and typecheck. Inspect desktop/mobile renders; correct actual layout issues.
   Expected: direct lessons and practice routes load, keyboard links work, only the correct navigation section is active; no page overflow.
7. Commit the cohesive implementation and tests.

## Task 2: Validate and document the result

**Files:** `docs/club-phase2-refinement-report.md`, focused responsive coverage as necessary.
**Interfaces:** Task 1's routes, guidance target and row layout.

1. Capture and inspect before/after at 320, 375, 768, 1024 and 1440px; check 200% zoom/reflow, menu touch targets, long labels and important tools.
2. Exercise navigation/back/reload, real lesson progress and timer persistence, cube controls, reveal/reduced-motion behavior, and both labs' retained focus/streaming protections using existing tests.
3. Run unit suite, typecheck, changed-file formatting check, production build and relevant Chromium/WebKit production/browser cases. Record failures and their actual disposition; do not weaken gates.
   Expected: checks pass, no introduced browser errors, accepted video files keep their hashes.
4. Finish report with prioritized audit, design decisions/value/risk, exact content sources, visual comparisons, test evidence and explicit limits. Reuse prior research; add references only for unresolved questions.
5. Commit, request a fresh whole-branch review, resolve material findings with regression evidence, preserve the review/ledger and retain the focused branch for the owner.
