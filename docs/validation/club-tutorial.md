# Club tutorials and written Guide

Implementation: `codex/club-tutorial`, based on approved design commit `0d691be3b1b6b08a26049195b750aab64af6d1ca`. Website changes do not alter solver formulas, teaching acceptance, Timer arithmetic or business-storage schemas.

## Coverage

- Optional first-visit welcome: start, later, never; manual Page tour remains available. Guide and unknown routes do not offer the welcome.
- Ten page variants: Home, questionnaire, Moves, introductory lesson, playable lesson, free solve, algorithm library, case detail, formula practice, Timer.
- Real U / U prime / Play actions and lesson Next move; explicit Next and always-available Skip and Exit. Moves and lesson leases restore the captured transient view paused, and discard it when navigation replaces the page.
- Dedicated tutorial preferences preserve incompatible/corrupt data until explicit reset. Colors, practiced lessons, practice scope and Timer attempts are not tutorial fixtures.
- Timer checks live idle/save state before opening; synchronous locks cover document keys and direct pointer/surface handlers. Held inputs must release before a fresh press. Genuine blur/visibility interruption handling is retained.
- Eight static Guide chapters, complete control references, route-scoped tour links, accessible screenshot enlargement and text fallback.
- Global edition has no tutorial provider, storage, Guide navigation or invitation.

## Screenshot provenance

Fifteen PNGs (12 desktop, 3 phone), total 1,423,589 bytes, captured from a local production build at `9e6bbf707d7e54ed678f802b202e61d4b0999772-dirty`. Dirty state was capture tooling, metadata and regression integration; the website UI was the Task 6 commit. Each image records dimensions, scenario, route and source revision in `src/club/guide/screenshots.json`.

Every scenario uses a new nonpersistent Playwright context; no member browser profile is read. Timer fixtures exist only in that context and both image and caption say example/sample. Cube captures wait for a visible renderer, actual vantages and completed frames. All fifteen files were visually inspected; no blank cube, clipped control or unlabeled sample was admitted. Desktop source width is 1360; phone width is 390. PNG paths and dimensions pass `verify:guide`.

## Verification record

- Task 1 definitions/storage/controller: 10 tests passed.
- Task 2 overlay/provider/focus/position: 21 focused tests and 4 Chromium/WebKit browser checks passed.
- Task 3 shared real actions/restoration: 121 focused units, 16 focused browser checks passed. A prior shared-player wait incorrectly used the single-move puzzle-object lifecycle; corrected to actual vantage rendering.
- Task 4 read-only inputs/library/practice: 66 focused units, 44 browser checks passed.
- Task 5 Timer locks: 84 focused units passed. Browser run initially 26/28 because fault injection did not run on hash-only navigation after welcome dismissal; explicit reload restored the original storage-failure scenario, and the affected 8-test suite passed.
- Task 6 Guide: 26 focused units passed; 10 browser checks passed after narrowing an overly broad engine-blocking test pattern. All ten tour destinations were exercised in both browser projects.
- Task 7 source unit suite: 542 tests / 119 files passed. Typecheck, production build and capture manifest validation passed. Full browser/production suites and independent review are recorded below when complete.

Desktop, 390/360 px phones, keyboard, 200% zoom, reduced motion, static renderer fallback and delayed readiness are covered by the focused checks. These are browser and automated checks, not renewed physical-cube acceptance.

## Release and video status

Website release verification is in progress. Preserve LBL/Beginner CFOP accepted and Advanced CFOP preview metadata; Pages uses the existing preview publication flag. The narrated sample and full film are separate deliverables; sample acceptance has not occurred, and no full film or video upload is authorized by website completion.

## Independent review and final corrections

One fresh-context reviewer inspected `f238746..040d9cc`, the spec, task plans and rulings, and reproduced two Important issues against the built site. No Critical or Minor findings were raised.

- Rotation/short viewport: a docked bubble obscured U. The overlay now reserves a visible control area, limits the reading panel and corrects scroll geometry. A real hit-test regression failed first, then passed at 640 × 360 and 150% zoom in Chromium and WebKit.
- Tall phone images: enlargement reduced width from 310 px to 92 px. The lightbox now keeps a readable width and scrolls vertically, with sticky Close. The width/focus regression failed first, then passed in both engines.
- A subsequent production check exposed idle preference updates restoring focus despite no tour having opened. A unit reproduction failed first; release now restores focus only when the runtime owned it. The built keyboard enlargement test then passed in both engines.
- The production engine blocker initially denied Vite's 1,676-byte preload helper named `cubing~global~club`. Inspection confirmed it contains only preload code. The test now blocks actual engine chunks and retains the no-engine request assertion.

Final local source suite: **543 tests / 120 files passed**. Typecheck and production build passed. Initial complete development browser run: **188/194 passed**, with six WebKit timeouts while other browser jobs were active; all six passed on an isolated retry (2.9 minutes), with assertions unchanged. Initial production run: 26/28; the two Guide failures were investigated as above and the complete four-test tutorial production set then passed. The final onboarding regression set and GitHub CI/release evidence are recorded at integration.

Review limitations: film/voice approval belongs to Tasks 8–10; no renewed physical teaching acceptance is claimed; CI and Pages require their own live evidence. These are separate gates, not reviewer approval of unpublished results.

Final onboarding regression after all fixes: **38/38 Chromium and WebKit checks passed**. No deferred review minors. GitHub CI and public deployment remain the integration gates.
