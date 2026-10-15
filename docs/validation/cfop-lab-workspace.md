# CFOP Lab workspace verification

October 14, 2026. Development branch; publication awaits the experiment notebook and final review.

## Verified

- Worker/client: 112 unit checks and Chromium/WebKit worker tests cover request isolation, independent main-thread route replay, cancellation, retained incumbents and the 30.5-second watchdog. Main/worker work partitions remain within the shared ceilings.
- Physical playback: 145 Lab/player checks, plus 22 browser checks across Lab, Advanced CFOP, F2L holds and player readiness. Tests cover non-white physical states, inverse color-input setup, actual rotations versus hand-only annotations, reverse stepping, archived formulas and the Cross + F2L endpoint. Stable Advanced validation remains separate.
- Analyze/Compare: 20 focused checks and 8 final Chromium/WebKit checks at 1440px/390px, keyboard Analyze, stable pins/positions across tabs, input invalidation, illegal notation/colors, lazy assets and asset-error recovery. Existing club entry (4) and color-entry (8) checks also passed. A mobile comparison overflow and a cramped position label were reproduced and corrected before commit.
- Guide/tutorial: 28 focused checks, with new chapter/tour tests observed failing before implementation. Fourteen Chromium/WebKit checks passed: deep-link focus, missing screenshot text, Guide without solver/engine requests, all five actual Lab targets, no analysis triggered by a tour, keyboard navigation, 390px layout and 200% layout scale. The shared tutorial guard/input lock is exercised; real trial integration follows Tasks 12–13.
- `verify:guide` and production build passed. Build retains the existing cubing large-chunk warning; no runtime browser errors in the successful checks.

## Captures

`public/club-guide/lab-analyze.png` and `lab-compare.png` were captured from the real UI in separate fresh browser contexts, using fixed scramble `R U F2 L D2 B R2 U' F D L2`. Search stops once two independently verified routes are available. Captions explicitly label example data; timing/coverage reflect that capture, not a benchmark. Both images were visually inspected for readable controls and a rendered cube. Existing images and accepted tutorial films were preserved. The capture command now supports selecting scenes without discarding earlier manifest entries.

## Pending evidence

Tasks 11–15 add persistence, trial timing, transfer, the final trial screenshot, integrated benchmarks and independent review. Browser viewport tests do not constitute real-phone performance or physical fingertrick acceptance. The execution model remains an uncalibrated hypothesis until actual club trials are recorded.
