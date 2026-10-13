# Club edition validation

Status: foundation implemented locally; Timer and the integrated release are still in progress. No deployment is claimed by this record. The owner approved all three linked implementation plans and authorized unattended integration and publication on October 13, 2026.

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

## Release constraints

Advanced CFOP and its revised human-friendly F2L remain Preview pending renewed physical-cube follow-along acceptance. Existing accepted LBL and Beginner CFOP remain available. Club progress and timer data are device-local, with no account or remote analytics. The club entry is public; its HTML requests no indexing, which is not access control. The global homepage does not promote the club entry. The README will provide a discreet member-oriented link without naming the school.

The fresh independent review and public deployment verification apply to the completed integration branch after the Timer tasks. Local visual checks do not replace the owner's physical-cube or club-use feedback.
