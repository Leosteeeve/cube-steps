# Webb Cubing Club redesign report

28 October 2026. Isolated implementation branch: `codex/club-editorial-redesign`, based on `002aecba433ff82d938bd83c81ad2342895d7d5a`. The live publication remains separate from this local redesign.

## Design outcome

The selected **Practice notebook** direction connects a student-facing entrance to a working learning environment. It replaces the home page's split marketing hero, orbit, floating notes, blue promotion strip and repeated feature cards with a full-width title, a real cube study, a ruled learning directory and a restrained practice shelf. Copy names concrete actions and avoids invented meetings, membership, achievements or personal records.

Research and the comparison of three directions are in [club-design-research.md](club-design-research.md). Twelve real references were inspected; loading and mobile-capture limitations are recorded there.

## Before and after critique

| Area | Before | Implemented response |
| --- | --- | --- |
| Home hierarchy | Abstract slogan, decorative orbit and notes compete with the learning action | “Pick up a cube.” above the real next action; cube placed in a separate practice spread |
| Page rhythm | Promotion strip, repeated rounded cards and repeated CTAs | One open headline, one two-column spread, ruled path rows, then a useful tool list |
| Typography | Georgia/Segoe mix and several 9–12px label tiers | Self-hosted Manrope with IBM Plex Mono for notation; readable secondary text and consistent heading weights |
| Color | Blue-tinted marketing and separate green/cream tool vocabulary | Warm paper, dark ink, deep green controls; cube colors provide restrained personality |
| Motion | Decorative cube loop | Static by default; explicit Watch a turn, pause/resume, stops after one bounded sequence; reduced-motion and visibility safeguards retained |
| Navigation | Multiple rows of similar lesson links; five method pills crowd phone screens | Three direct learning links and a keyboard-operable More tools menu; scrollable method row on small screens |
| Shared styling | Header/home rules repeated in base and lazy feature styles | Club tokens, shell and home have explicit ownership; lazy Moves no longer redefines the header |
| Tools | Heading, surface, border and metadata treatments differ by feature | Selected lesson, quiz, Guide, Timer, Moves and Lab surfaces share the new vocabulary; workspace geometry and controllers retained |
| Feedback | Blue tutorial popovers differ from their host | Matching surface, readable status text, focus and action styling; tutorial lifecycle unchanged |

The design retains useful cards where they identify a selectable answer or an interactive workspace. Removing all containers would make these tools harder to understand.

## Design system

- `design-tokens.css`: paper `#f7f5ef`, surface `#fffefa`, ink `#242b28`, muted `#59635c`, wash `#e9eee4`, action `#245941`; spacing scale 8/16/24/40/64/96; 8px control radius; 1200px editorial measure and responsive gutters.
- `shell.css`: header/footer, primary and text actions, menus, focus, tutorial feedback and selected shared learning surfaces. Geometry for dense workspaces remains in existing feature files.
- `home.css`: editorial composition and deliberate 700/1024px reflow. Desktop and phone share one DOM order and one set of tutorial target refs.
- Fonts add approximately 39KB of WOFF2 assets, served from this origin. Both OFL licenses are retained with the source and in `public/licenses/club-fonts`; the notices generator includes them. No runtime dependency was added.
- Interactive color transitions are 140ms and disabled under reduced motion. Important controls retain at least 44px targets. Facelet colors in learning engines and Lab inputs are unchanged.

## Changed code

Home and identity: `src/club/HomePage.tsx`, `design-tokens.css`, `home.css`, `shell.css`, `main.tsx`, `components/ClubLogo.tsx`, `components/ClubFooter.tsx`, fonts and notices.

Shared integration: `src/club/ClubApp.tsx`, `club.css`, `src/ui/workspace.css`. Selected feature refinements: `guide/GuidePage.tsx`, `guide/guide.css`, `timer/TimerPage.tsx`, `timer/timer.css`, `moves/moves.css`, `lab/lab.css`, `roux-lab/roux-lab.css`.

Cube study: `hero/HeroCube.tsx`, geometry palette, regenerated original SVG fallback and `hero.css`. Tests cover static default, starting, pausing, bounded completion, visibility and reduced-motion behavior.

Browser regression assertions were updated for intentionally changed copy. `e2e/club-editorial.spec.ts` adds four-width coverage of eight tools, arrow-key entry and Escape through More tools, and a header geometry comparison before/after loading Moves. `src/ui/SectionMenu.tsx` supports optional up/down entry into an open disclosure while retaining native Tab behavior. Existing player, timer, tutorial, persistence, quiz and global-edition assertions are retained.

## Preserved contracts

Hash routes and existing deep links; exact resume destination and storage keys; selected method; self-reported practiced progress; timer input ownership and persistence; cube engine and solve workers; CFOP/Roux/advanced routes and lab notebooks; 2D fallback; tour targets and provider lifetimes; accepted Guide v3 media; Preview/Experimental and pending physical-ergonomics status. No external accounts, analytics, user data collection or fabricated community content.

## Validation and screenshot iteration

Evidence is stored outside the checkout in `D:/Projects/Cubing Calculator/validation/club-editorial-redesign/` so it survives eventual worktree cleanup.

- Baseline: 1,089 unit tests. Two local HTTP asset cases initially failed inside the network-restricted sandbox and passed unchanged outside it.
- Redesign: 1,090 unit tests / 236 files passed. Type checking passed. Production build passed; existing large cubing-library chunk warnings remain.
- Visual inspection covered the home at 375, 768, 1024 and 1440px, plus selected lessons and tools. Actual screenshot findings led to reducing phone method-navigation height, aligning tutorial colors, strengthening tool heading weights and enlarging old 9–10px metadata.
- Menu-entry and WebKit pointer-focus regressions failed first, then all five SectionMenu tests passed after the fixes. The full 1,090-test run preceded these two additional cases; it is not described as a fresh 1,092-test full run.
- Changed TypeScript/CSS/scripts pass Prettier checking and `git diff --check`. The repository has no separate lint script.
- Core text contrast: ink/paper 13.27:1; muted/paper 5.73:1; muted/wash 5.30:1; white/action 8.14:1. These checks cover the new core tokens, not every possible application state.
- The font-notices generator was run in an isolated fixture using the installed dependencies; both generated notice files match the checked-in output. Both OFL files are present in the production build.
- The accepted Guide v3 remains 27,968,918 bytes with SHA256 `24be7ff7f23507cd514c21a2591894afe1dd20d2300c70ca1f75b3550eeceaf1`.
- Development coverage: the initial 96-case Chromium/WebKit run passed 81, exposing obsolete home-copy locators, screenshot-height limits and the menu behavior described below. Follow-up runs covered every failed case: 36/38, then nine layout cases plus the repaired menu case, and a final six-case desktop/phone/menu run passed. This is staged regression evidence, not a claim that the entire 96-case suite was rerun on the final revision.
- Production coverage: the 80-case run passed 77; the two club viewport cases exposed narrow/zoom overflow, and one WebKit Roux comparison case hit the streaming race below. After fixes, ten of twelve targeted production cases passed; the two remaining zoom cases led to the final shared wrapping correction. The unchanged four-case global/club 320/390/430px and 200%-zoom suite then passed against the rebuilt production assets. Final typecheck/build and formatting checks pass.
- Direct browser inspection covered home 375/768/1024/1440, lesson 375/1440, Timer 375, Moves 1024 and Guide 1024. Final home full-page captures were inspected after the last adjustment. Captured browser error logs were empty on these manual routes. Automated tests retain route, persistence, worker, film, tour and actual move-rendering assertions.

`before/` and `after/` contain viewport comparisons. Open the external `comparison.html` for side-by-side home and lesson views. The automated browser suite also saves full-page captures where the page is under 16,000px tall. In-app full-page capture was unavailable; viewport captures were inspected directly. The long algorithm library and Guide exceed WebKit's 32,767px capture limit, so they use viewport evidence without changing any functional assertions.

## Independent review and implementation rulings

The independent whole-change review found no blocking or actionable code findings. Its optional request to guard header geometry after visiting a lazy route was accepted and added to the browser regression. Narrow follow-ups accepted the 320px wrapping safeguard, optional arrow-key entry and the WebKit mouse-down focus correction. The latter prevents only the primary mouse-down focus default, leaving native click and auxiliary events intact. Modified-click behavior was reviewed in code but not browser-certified. The reviewer could not run its own live probe; the parent performed the documented browser inspection. Review evidence is preserved in the external `review.txt`.

The mobile method row intentionally scrolls horizontally with a visible scrollbar. It preserves native links and reduces stacked navigation, with the tradeoff that later methods require scrolling. The current method remains clear in the selected link and lesson heading.

The browser runs exposed a real 320px header overflow, corrected by compact spacing and a wrapping fallback. The existing 200%-zoom test additionally caught header/footer min-content overflow, resolved by allowing both flex groups to wrap independently of a viewport breakpoint. WebKit's default Tab traversal skipped native links in this environment; optional arrow-key entry gives an additional route into the open disclosure without overriding browser preferences. Event logging also proved that clicking a menu link moved focus to the `tabindex` ancestor, closing the menu before the click; explicitly retaining link focus on primary mouse-down fixes this. Both browsers passed the navigation/Escape/header-geometry case afterward. Old homepage-copy locators were updated to the deliberate new wording, retaining destination assertions. No timeout or solver assertion was relaxed.

## Remaining limits

This is expert visual and technical validation, not a student usability study or complete accessibility certification. Real students should still try the first lesson, method selection and a timed solve on their own phones. Existing accepted Guide video and embedded historical screenshots depict the previous visual skin; their routes and operations remain valid, and replacing the accepted film requires a separate media acceptance cycle. The redesign does not claim physical ergonomics or advanced solver teaching acceptance.

One existing experimental Roux Lab race remains recorded: a leading candidate can be replaced between pointer-down and click during streaming, so the first comparison selection may not register. The saved trace shows the leading card replaced and only A selected after the second click. `AnalyzePage.tsx`, `RouteSummary.tsx` and the comparison test are unchanged from the baseline. A bounded focused reproduction passed all four desktop/phone Chromium/WebKit comparison cases, but that does not prove the race fixed; no such claim is made. Waiting for analysis to finish before selecting A/B avoids changing candidates during selection. This needs a separate stable-interaction treatment if experimental Lab testing is part of the launch.

No deployment, remote branch push or PR is included in this local design delivery.
