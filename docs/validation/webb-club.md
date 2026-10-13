# Club edition validation

Status: all planned local functionality is implemented. Independent review identified one important history-refresh race, reproduced and fixed with deterministic tests. Publication remains subject to the exact-commit GitHub checks and public-site verification. The owner approved all three linked implementation plans and authorized unattended integration and publication on October 13, 2026.

## Shared foundation

- Separate global `/cube-steps/` and club `/cube-steps/club/` HTML entries share courses, solvers, color input, formula catalog, workers and playback. Club styles are scoped to the edition root.
- The compact original W/cube SVG identity and blue/white homepage follow the approved visual references. Desktop 1280 px and phone 360/390 px screenshots were inspected; the decorative cube geometry was corrected during inspection. Functional cube diagrams retain real sticker colors. White contrast ratios are 15.15 for navy, 5.75 for royal blue, 6.06 for muted text and 6.51 for accent text.
- All 72 questionnaire combinations map to available introductory courses. Ability takes precedence over ambition. Back, skip, keyboard completion and manual override are tested. Answers are not persisted.
- Progress records only selected method, valid last lesson and self-reported practiced lessons. Unsupported/corrupt club progress, practice selections and color drafts remain unchanged until explicit reset. Denied/quota storage keeps the page usable. Global defaults remain separate.
- Library-to-practice selection uses the same edition store, including in-memory selections when saving fails. Lessons ignore late cancelled example responses; visits and practice flags remain synchronized across routes.
- Shared 150 ms control feedback and 200 ms panel entrances respect device reduced motion, local Off and document visibility. Motion preference storage is separately namespaced, preserving unsupported data. No continuous decorative animation runs.

## Foundation checks

- TypeScript and two-entry production build passed. The existing large-chunk advisory remains for bundled puzzle/catalog assets.
- Full unit suite: 82 files, 340 tests passed on Windows with Node 24.18.0.
- Shared learning, library, selected-case practice and color-input browser selection: 28 Chromium/WebKit checks passed. The final club lesson selection passed four additional checks after visual refinement.
- Deep-link reload testing exposed third-party module imports aborted by an immediate page reload. The test now waits for actual cube rendering before reloading, rather than inferring readiness from an enabled button. Application errors remain asserted, not filtered out.
- Final foundation verification passed eight club entry/learning browser checks and all 12 production checks in Chromium/WebKit. Production checks confirm resolved favicon assets, direct-link reload, global identity, reduced-motion changes, preserved paused move/holding state, keyboard focus and separately persisted preferences. The complete Timer release extends this same record.

## Timer evidence

- The pure state machine covers 299/300 ms arming, original inspection time across short holds, 14,999/15,000/16,999/17,000 ms release thresholds, mixed keyboard/pointer input, repeated keys, lost releases and interruptions. Elapsed time comes from monotonic timestamps, not frames or wall-clock time.
- Scramble generation uses the existing real cubing.js worker service. Request epochs discard stale results; each displayed sequence, immutable cube state and six-face net are one prepared unit. New scramble stays disabled during preparation/timing. A generation failure retains the completed result.
- Native IndexedDB transactions resolve on completion. Real Chromium/WebKit tests cover reopening, concurrent adds, idempotent original records, stale revisions, deletion/Undo conflicts, malformed rows retained in place, unsupported newer databases and cross-tab notifications. Failed saves remain in memory, export with unsaved IDs, and persist exactly once after retry.
- Timer settings preserve incompatible bytes until Reset. Keyboard timing excludes form controls, links, editable regions and dialogs. Changing focus out of an armed keyboard input cancels the hold. Native touch starts inspection on both engines; production checks also exercise held touch in Chromium and pointer hold followed by touch stop in WebKit.
- Averages keep full precision, add automatic/manual +2 independently, discard exactly one best/worst, and handle one/two DNFs. History uses 25 rows per page; trends calculate windows from full history before displaying the latest 50. DNF/missing values leave line gaps. A keyboard-accessible selector exposes exact chart values.
- Actual CSV and JSON downloads were parsed after persistence, correction and reload; unsaved results were also exported before successful recovery. Raw durations, scramble, inspection, manual penalty, interruptions, revision and save status are retained. No prototype example times ship.
- Timer domain tests: 12 files / 45 tests passed. Targeted browser checks passed in Chromium/WebKit: ten control/input checks, four real-storage checks, and eight history/export/layout checks. The integrated development browser run passed all 114 checks. Cross/case assets reverified: 190,080 coordinates and 972 setups for 119 cases.
- Production testing exposed a reduced-motion change between initial render and event subscription. A regression test reproduced the missed update; resynchronizing after subscription fixed it. All six motion tests and five repeated WebKit production checks passed. The production Timer navigation test was also corrected to expect the static notation lesson's heading rather than nonexistent playback controls.
- Empty and populated Timer screenshots at 1280, 390 and 360 px were inspected. Timing, export and penalty controls meet the 44 px target; no horizontal overflow was detected. The numeric running clock is excluded from live announcements; instruction/result announcements occur at meaningful transitions. Cube sticker colors remain unchanged.

## Final independent review and regression pass

- One independent reviewer inspected the complete branch, both designs, all three plans, all 15 task review-focus sections and the execution rulings. It reported no critical issues, one important issue, no minor issues and no declined judgments. Its merge assessment was conditional on fixing the history-refresh race.
- A local save could invalidate an initial or cross-tab history read without replacing it. The database remained intact, but history, averages and exports could be incomplete. Five deterministic regressions failed before the fix, covering successful saves, failed saves, retries, concurrent corrections and deletions. Pending rows now overlay useful in-flight reads; a committed save requests a fresh authoritative snapshot while retaining stale-read protection. All five regressions passed afterward.
- An additional lifecycle check reproduced a disabled Timer after a persisted `pagehide`/`pageshow` sequence interrupted a solve. Restoration now refreshes history and prepares a new scramble when needed. The browser regression uses explicit persisted page-transition events; it does not claim every browser's real back-forward-cache eligibility was tested.
- TypeScript and the full unit suite passed after these fixes: 94 files, 391 tests. The earlier integrated development run passed 114 browser checks and production passed 16. The added restoration case brings the complete development suite to 116; final remote CI runs the full suites again before publication.
- No review findings were deferred. Revised F2L physical-cube acceptance remains pending and is not replaced by this review.

## Execution decisions

The Native workflow used one sequential implementer and one fresh final reviewer. These decisions were recorded during execution:

1. Use an ignored Git worktree under the actual repository because the native workspace tool detected the outer folder as a non-repository. Cost if wrong: manual worktree cleanup; isolation remains explicit.
2. Use a small Node helper for task-start/task-done because the installed Bash entry was blocked and Python resolved to a Store alias. Cost if wrong: helper auditing discrepancies; task briefs, base commits, logs and pass-only completion markers were retained.
3. Publish revised Advanced F2L as Preview under the owner's unattended release authorization. Cost if wrong: ergonomics still need renewed physical follow-along feedback; existing accepted methods remain available.
4. Reuse independent pair-placement/catalog fixtures in the holding tests instead of adding a duplicate fixture module. Cost if wrong: fixture coverage could be narrower; all five specified review cases are explicitly covered.
5. Cache bounded formula transformations, immutable selection simulations, frozen-state observations and local state keys; use typed orbit copies while preserving deep freeze. Cost if wrong: geometry or cache-staleness regression; core, corpus and rendering checks cover these boundaries, and simulation budgets count cache hits.
6. Review all three linked plans once on the integration branch. Cost if wrong: interaction defects could evade a single review; the whole-branch review includes each plan's focus areas and integrated tests.
7. Add a noindex/nofollow request to the club HTML. Cost if wrong: crawlers may ignore it; the site and repository remain public and the README says so.
8. Preserve unsupported club practice/draft bytes until explicit Reset, with global defaults unchanged. Cost if wrong: incompatible data can require a user reset instead of automatic migration.
9. Include the edition-aware practice hook and algorithm-library consumer omitted from the file map. Cost if wrong: a broader shared consumer change; tests cover namespace separation and memory-only handoff.
10. Add an explicit scramble-loading machine input for atomic New/Retry behavior. Cost if wrong: an extra state transition could disable timing incorrectly; controller and browser tests cover readiness and failures.

## Release constraints

Advanced CFOP and its revised human-friendly F2L remain Preview pending renewed physical-cube follow-along acceptance. Existing accepted LBL and Beginner CFOP remain available. Club progress and timer data are device-local, with no account or remote analytics. The club entry is public; its HTML requests no indexing, which is not access control. The global homepage does not promote the club entry. The README provides a discreet member-oriented link without naming the school.

The fresh independent review and public deployment verification apply to the completed integration branch after the Timer tasks. Local visual checks do not replace the owner's physical-cube or club-use feedback.
