# Club editorial redesign implementation plan

Execution: Native, parent implements. User explicitly authorized autonomous research, direction selection, implementation and validation; no additional design approval pause is required. Existing React/Vite/native CSS and hash routes remain. Isolated branch: `codex/club-editorial-redesign` from `002aecba`. Specification: `docs/club-design-research.md`.

## Tasks

1. Research twelve real references; capture baseline; audit architecture. Preserve audit evidence outside checkout. Baseline: 1087 unit cases passed in sandbox; the remaining two localhost media tests pass unchanged outside it (1089 total).
2. Add self-hosted licensed Manrope/IBM Plex Mono and club design tokens. Consolidate header/home ownership, remove lazy header leakage, retain global geometry.
3. Replace homepage with editorial masthead, real cube practice spread, beginner/developing/advanced directory and useful practice links. Retain every guidance target and dynamic resume link.
4. Make hero motion opt-in and bounded, test idle/start/pause/end/offscreen/reduced-motion/fallback; use recognizable solved-cube face colors and matching generated vector fallback.
5. Align shell/footer and selected lesson, quiz, Guide, Moves, Timer, algorithm and Lab surfaces. Preserve functional controllers and responsive lesson disclosures. Refine redundant learning navigation using existing menu primitives only if verified.
6. Run focused unit/component tests, typecheck, targeted format check, production build and meaningful Chromium/WebKit regression coverage. Inspect screenshots of home and tools at 375/768/1024/1440; exercise menus, tours and cube/timer controls. Iterate on evidence.
7. Fresh independent final review; resolve blocking findings. Save changed-files/before-after/validation/limits report and screenshots. Commit coherent local work; provide local preview. Publication is a separate action from the prior completed PR20 deployment.

## Acceptance

No fabricated progress/community facts. No decorative autoplay or new runtime dependency. Real browser screenshots inspected. No horizontal document overflow at target sizes. Keyboard menus and tour refs retained. Existing cube/timer/progress/labs and accepted video preserved. Design tokens scoped so global edition is not recolored. Build and relevant tests pass; environmental failures explicitly separated from source regressions.
