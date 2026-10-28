# Club interaction polish and publication

Spec: the owner's approved editorial redesign and follow-up of 2026-10-28: fix Roux Lab streaming-card clicks first, research better typography, add restrained reveal motion, then use the established GitHub/check/merge/Pages/local-sync workflow.

## Global constraints

- Work in the existing `codex/club-editorial-redesign` isolated checkout. Preserve the reviewed redesign at e4e14d8 and all historical media/evidence.
- No change to solving algorithms, search budgets, persisted records, teaching acceptance, or the accepted Guide v3 film.
- Activate route actions on click/keyboard activation, never on pointer down. A newer stream result must not replace a target during a gesture or while it has keyboard focus.
- Self-host licensed fonts. Motion enhances visible content, respects both reduced-motion and the site's motion preference, and never moves tool controls.
- Existing authorization covers GitHub submission, reviewed-head merge, one Pages dispatch with Preview true / teaching accepted false, live verification and safe local synchronization.

### Task 1: Stabilize streaming route interactions

Interfaces: AnalyzePage presents a temporary route/coverage snapshot during pointer gestures or focus; callbacks carry the exact route; session comparison validates retained snapshots against the current input/frame and verified-route admission.

1. Reproduce replacement between pointer-down and activation, and focused-button replacement, in the real AnalyzePage. Add coverage for release, reset, and comparing a route removed from the latest recommendation window.
2. Run focused Vitest; Expected: new regression assertions fail on the unmodified implementation.
3. Retain presentation only during interaction; continue worker progress. Restore current routes on release/blur; expose an explicit refresh when focused results lag. Reject obsolete/foreign/unverified route actions. Preserve native canceled gestures.
4. Run focused tests, typecheck and real Chromium/WebKit streaming comparison. Expected: regressions pass; exact clicked route is selected and comparison remains fixed.
5. Commit this fix independently.

### Task 2: Research typography and add restrained reveal

Interfaces: existing club design tokens, motion preference, HomePage; no learning-workspace geometry changes.

1. Inspect real typography/motion references with browser screenshots, document observed details separately from interpretation. Compare continuity, legibility and character; choose a restrained system.
2. Add behavior tests for reveal eligibility, reduced motion, preference changes, focus and observer cleanup. Expected: missing behavior fails before implementation.
3. Implement self-hosted typography and once-only homepage section reveal; keep content visible without JS/IntersectionObserver and in reduced motion. Retain existing notation font.
4. Inspect 375/768/1024/1440 screenshots, including learning/tools and keyboard operation. Iterate on actual images.
5. Run formatting/typecheck, appropriate unit/browser tests and production build. Expected: no introduced regressions. Commit.

### Task 3: Review and publish

1. Fresh-context whole-branch independent review against main; resolve actual blocking findings with regression evidence.
2. Push one feature branch and create/attach one PR. Wait for all required checks on the exact reviewed head; inspect remote reviews.
3. Merge only that head, dispatch Pages once with the established Preview inputs, wait main CI and Pages.
4. Verify exact live clean SHA, homepage/learning/deep links, real streaming comparison, questionnaire and retained v3 Guide video; inspect desktop/phone screens and browser errors.
5. Fast-forward clean primary main; verify local/remote equality. Preserve ignored ledgers/evidence with hashes before removing only the merged disposable worktree/branch and owned preview processes.
6. Record outcomes and send the live links plus remaining acceptance limits.
