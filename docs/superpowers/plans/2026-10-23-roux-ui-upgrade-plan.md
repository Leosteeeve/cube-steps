# Roux and UI Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the approved shared UI refresh, club Advanced Roux and Roux Test Lab, followed by the two accepted-style films.

**Architecture:** Keep physical verification and the common player shared. Add an isolated advanced Roux engine and a separate Roux experiment namespace, using current beginner policies as a verified fallback. Five sequential subsystem plans carry exact contracts and reviewable tasks.

**Tech Stack:** Node >=24; existing pinned React 19.3.0, TypeScript 7.0.2, Vite 8.3.4, cubing.js 0.65.1, Vitest 5.0.3 and Playwright 1.64.0. Reuse the existing Remotion/FFmpeg media toolchain outside the application bundle.

**Spec:** [Owner-approved design](../specs/2026-10-23-advanced-roux-and-ui-design.md). Read the design and this overview before any subsystem plan.

## Global Constraints

- All user-facing content is English. Global green/white; club blue/white. Club features and school branding do not appear in the global edition.
- Preserve existing LBL, both CFOP levels, Beginner Roux, CFOP Lab, Timer, Moves, Guide and saved data.
- Initial positioning is explicit. Camera orbit is not a physical turn. Eight allowed frames are white/yellow bottom × blue/green/red/orange left, with the real handed color scheme.
- A verified complete baseline remains available when optimization fails or exceeds the first-block d+2 recommendation threshold.
- Normal search: 8 seconds / 500,000 accounted operations; Lab: 30 seconds / 2,000,000. Global cache/frontier ceiling 25,000, static decoded assets 32 MiB, retained worker data 128 MiB, route 512 moves / 128 actions.
- Complete CMLL: 42 non-solved cases plus skip. Ordinary EOLR and a real basic alternative are required; EOLRb is deferred.
- Preview deployment may precede physical acceptance; correctness/data-loss failures may not. Advanced Roux stays Preview and the Lab Experimental until the specified acceptance conditions change.
- Films have no spoken narration. Preserve “Your turn. Keep your curiosity.” No automatic email sending.

## Review Focus

- A later proof excludes the only full solution: retain a labeled baseline, not an empty success — Tasks 13–14.
- Changing physical orientation silently changes piece identity or center meaning — Tasks 5–6 and 15.
- An old CFOP experiment or failed database transaction is overwritten by Roux data — Tasks 20–21.
- WebGL/context loss or camera movement makes the screen disagree with physical moves — Tasks 2–3 and 22.
- A source refresh invalidates a captured lesson or publishes an unaccepted film — Tasks 23–26.

---

## Execution order and milestones

The owner approved all five plans and selected **Native** on 2026-10-23: implement sequentially in this chat with `superpowers:executing-plans`, then obtain an independent whole-branch review. No additional execution-mode approval is needed. Short/full media acceptance remains separate.

| Plan                                                               | Tasks | Independently checkable deliverable                                                             |
| ------------------------------------------------------------------ | ----- | ----------------------------------------------------------------------------------------------- |
| [1. Shared UI and player](2026-10-23-roux-ui-foundation.md)        | 1–4   | Existing methods operate correctly in the blended interface.                                    |
| [2. Frames and block search](2026-10-23-roux-block-search.md)      | 5–10  | Headless eight-frame block candidates, proof status and execution score.                        |
| [3. Complete Advanced Roux](2026-10-23-roux-complete-solver.md)    | 11–15 | Full verified solves, bounded workers and an 8,000-replay corpus.                               |
| [4. Club learning and Lab](2026-10-23-roux-club-delivery.md)       | 16–22 | Courses, CMLL practice, quiz, comparisons/trials, Guide and a reviewed website preview release. |
| [5. Films and final publication](2026-10-23-roux-media-release.md) | 23–26 | Reviewed short film, accepted full film, updated Guide video and final local synchronization.   |

UI work is validated on the existing methods before adding Roux features. Website publication in Task 22 does not wait for the replacement film; the current accepted Guide film remains until Task 26. Media captures are made against the exact verified website revision, not a stale prototype.

## Execution start

- [ ] Inspect `git status`, current branch, attached worktrees and remote state. The design/plan branch starts at `codex/roux-advanced-design`; its future commit hash must be recorded, not guessed. Follow `using-git-worktrees` at execution time and reuse a suitable attached worktree or create one from the approved plan commit. Preserve primary-checkout changes.
- [ ] Fetch and inspect `origin/main`; incorporate newer reviewed changes before product edits, resolving conflicts without dropping the approved design. Do not run an old publication helper or reuse a historical PR number.
- [ ] Use existing dependencies when lockfile/runtime match; otherwise run `npm.cmd ci` inside the execution worktree. Establish `npm.cmd run typecheck` and `npm.cmd run test:unit` once. Record failures honestly.
- [ ] Keep task commits focused. Use `git add -- <task files>` rather than staging unrelated work. Source paths in subsystem plans are repository-relative; media/validation paths are explicitly workspace-relative.

## Module boundaries and dependency map

| Location                                                | Responsibility                                                                     | Established by |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------- |
| `src/ui/`, `src/player/`, shared app/club shells        | Presentation, motion, playback and accessible fallbacks; no solver heuristics      | 1–4            |
| `src/methods/roux-advanced/`                            | Frames, physical predicates, block search, CMLL, LSE, runtime, finalization        | 5–13           |
| `src/workers/roux-advanced.*`, `src/roux-lab/client.ts` | One progressive protocol for normal and Lab workloads, cancellation and validation | 14             |
| `src/content/roux-advanced*`, `src/club/roux-advanced/` | Course, CMLL library/practice and normal advanced solve UI                         | 16–17          |
| `src/roux-lab/`, `src/club/roux-lab/`                   | Lab selection, immutable experiments, trials and UI                                | 18–21          |
| `scripts/roux-advanced/`, `tests/advanced-roux-*`       | Reproducible tables/examples, independent coverage and benchmark reports           | 6–15, 17       |
| `scripts/tutorial/`, `src/club/guide/`                  | Capture contracts, screenshots, transcript and published video manifest            | 22–26          |

The current fixed-frame `src/methods/roux/` remains the beginner method. Do not turn all of it into a general framework; extract only pure, tested helpers actually needed twice. The existing `src/lab/` data model has CFOP-specific fields and must not be cast to the new Roux shape.

## Contract ownership

Task 5 owns `RouxFrameId`, `RouxFrameMap`, `RouxInput`, `RouxSearchBudget`, `AdvancedRouxStageId`, action metadata and common result envelopes. Task 6 owns `FirstBlockEvidence` and `BlockSearchAssets`. Tasks 7–8 own `BlockCandidate`/`TwoBlockCandidate`. Task 9 owns `RouxExecutionScore`. Task 11 owns `CmllCatalog`; Task 12 owns `AdvancedLseAssets`; Task 13 combines those into `AdvancedRouxAssets` and `RouxRoute`. Task 14 owns wire messages. Tasks 20–21 own experiment and trial persistence. Other plans consume these definitions, not competing interfaces with similar names.

No task creates a placeholder passing implementation. A new test must first fail for its intended missing behavior; use focused existing tests where the change is visual/reversible rather than assertions that mirror CSS. Tests shown in the plans are contract examples inside the named fixture context, not complete test files. Extend that file's setup/imports using the existing repository conventions.

## Verification commands and reporting

Use `npm.cmd`/`npx.cmd` on Windows, `npm`/`npx` in CI. New scripts are added by their owning tasks before use. Final gates include current CI checks plus the new generator, CMLL/LSE coverage, 8,000-replay corpus and advanced Roux browser checks. No gate is removed to shorten CI.

Heavy corpus generation uses deterministic work caps; separate performance runs use real deadlines. Record app revision, seeds, configurations, hardware/browser and failed cases in `docs/validation/2026-10-23-advanced-roux.md`, with bulky evidence under workspace `validation/advanced-roux-upgrade/`. Separate automated, browser, emulated-phone and human evidence. Do not manufacture a Worker heap or physical-phone PASS.

## Plan self-review record

Spec mapping: Sections 1–4 → Tasks 1–4 and 22; Sections 5–7 → Tasks 5–10, 13–15 and 17–19; Section 8 → Tasks 11–12, 16–17; Section 9 → Tasks 5, 10, 13–15; Section 10 → Tasks 18–21; Section 11 → Tasks 16–17 and 22; Section 12 → Tasks 23–26; Section 13 → Tasks 15, 22, 24–26; Section 14 → Tasks 6, 9, 11–12 and media credits. Self-review checks signatures, budgets, dependency order, all five Review Focus items and preservation of current routes/storage. Implementation remains pending approval.
