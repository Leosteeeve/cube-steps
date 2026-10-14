# Club Onboarding, Guide, and Tutorial Video

Status: the owner approved this written design on October 13, 2026 and requested implementation plans. The owner selected segmented tours, light hands-on interaction with skippable steps, and a 4–6 minute video with English narration, English captions, and real website operation. Implementation-plan approval is the next step. No tutorial implementation, video production, dependency installation, or publication has started.

## 1. Purpose and audience

Help a new club member understand what the website offers, choose a useful starting point, and independently repeat a short learning-and-practice routine. Most of the approximately 40 members cannot yet solve a cube independently. The experience must also remain useful for members who already solve and want practice tools.

Use the existing Webb Cubing Club blue-and-white identity and English product language. Support in-person club lessons and self-study on desktop and phones. Retain the public, account-free club site, separate from global CubeSteps. Do not add school-identifying details to global navigation or promote the club URL there.

Three complementary outputs serve different needs:

- Optional bubbles explain the current page and let members try a few simple controls.
- A permanent Guide provides screenshots, written instructions, control references, and links back to each feature.
- A narrated video demonstrates an ordinary learning session in 4–6 minutes. It is an introduction, not a complete button reference or a replacement for cube lessons.

Success means a beginner can find a route, understand a move, follow a lesson with a physical cube, find help when stuck, and start practicing with the timer. They can find instructions again without replaying everything.

## 2. Approaches considered

1. **A shared club tutorial system — recommended.** Keep chapter names, feature links, terminology, and action identifiers in a small local content catalog. A reusable tour controller reads step definitions; the Guide uses related written content. The video script follows the same chapter map but has its own spoken pacing. This requires some initial integration, but makes content drift and keyboard behavior easier to check.
2. **Separate instructions built into each page.** Smaller initial changes, but repeated positioning, dismissal, focus, and progress behavior would be harder to keep consistent. Screenshots and video could easily refer to different terminology.
3. **An externally hosted onboarding service.** Potentially quicker authoring, but adds an external runtime and service dependency to a small, account-free static website. It is unnecessary for the approved scope.

Use the first approach. No analytics platform, account system, or remote tutorial state is needed. A small positioning/accessibility dependency may be evaluated in the implementation plan; this design does not require inventing a general-purpose tour framework.

## 3. Entry, navigation, and remembered choices

Add a club-only `#/guide` route and a visible Guide link in the main navigation and footer. Preserve Home, Moves, Learn, and Timer. Keep phone navigation usable without horizontal overflow.

On a browser's first eligible club visit, show a small welcome dialog: “Would you like a quick tour?” with Start tour, Not now, and Don't ask again. Explain that the Guide is always available. Eligibility requires a supported tour page, a ready interface, no other open modal, and no active timing attempt. Guide and not-found pages never open this dialog automatically. A visitor who starts using the page before the offer is ready should get a quiet inline offer instead of a late dialog stealing focus.

- Start tour opens the current page's introduction. From Home, it starts the approximately one-minute site overview. A deep link does not force navigation back to Home.
- Not now dismisses the welcome for the current visit. On later visits, offer a quiet inline reminder instead of repeatedly reopening the dialog.
- Don't ask again suppresses automatic invitations on this browser, while keeping manual tour and Guide links available.
- After starting a tour, do not automatically reopen the welcome dialog. Incomplete tours can be resumed manually.
- First visits to other supported pages show a small, dismissible “Show me this page” invitation unless Don't ask again is set. It starts only when selected. Completing or dismissing that page's invitation suppresses automatic repetition for its current tutorial version.

Every supported page has an unobtrusive Page tour button. The Guide also offers Start tour / Resume tour / Restart tour as appropriate. A page tour stays on its page; navigation to another page ends the current overlay and remembers the next useful step. Completed tours remain completed when replayed; replay position is independent of completion status.

Store only tutorial preferences and progress in a separate, versioned club local-storage key. Use stable tour/step IDs. A completed walkthrough is not evidence of cube mastery. Never merge its state into practiced lessons, quiz answers, timer history, or formula selections. If storage is unavailable, keep the current visit usable and clearly avoid promising persistence. Preserve unrecognized newer saved data; use memory-only state until an explicit tutorial-only reset. A tutorial reset must not reset any other feature.

## 4. Bubble behavior and light interaction

Use a restrained blue-and-white bubble with a title, one short explanation, a pointer or clear target outline, and progress such as “2 of 5.” Provide Back, Next, Skip step, and Exit where relevant. Support Escape to exit and return focus to the start control or a sensible page heading if the original control is gone.

For explanatory steps, Next is immediately available. For hands-on steps, explain the requested action and wait for that specific action. Completion updates the bubble to “Done” and enables Next; it does not unexpectedly move the bubble while the member is reading. Skip step always permits continuing. A pre-existing selected value must not falsely prove that the user completed a new interaction.

Only a few actions are hands-on: choosing a notation symbol, pressing Play, using one lesson step, or expanding an explanation. Complex color entry, persistent selections, progress checkboxes, destructive actions, and real timing are explained through screenshots or labeled examples rather than required exercises.

Do not depend on English button text as a selector. Pages expose stable tutorial targets and semantic completion events. Shared learning/player components may expose optional hooks, but do not import the club tour controller or display onboarding in the global site.

### Layout, readiness, and accessibility

- Highlight one target at a time without covering its text, essential cube view, or the bubble's controls.
- Reposition after layout changes, scrolling, phone rotation, and content expansion. On narrow screens use a compact docked bubble when a floating placement cannot fit.
- Keep focus navigation within the available tour controls and the current interactive target. Do not make the required target inert under the overlay. Announce the step and completion state without repeatedly announcing position changes.
- Respect reduced motion and maintain visible focus, readable contrast, and touch-sized controls.
- Start an action step only when its real control is ready. If a cube renderer fails, explain the limitation and allow skipping to the written Guide.
- If a target is absent, collapsed, loading, or removed, do not anchor to an arbitrary position or wait indefinitely. Show a clear unavailable-step state with Skip and Exit. Open a local disclosure only when necessary and without changing saved preferences.
- Ignore late readiness/completion events from an exited tour or previous route. Browser Back and Forward must not leave an orphan overlay.

## 5. Page coverage

The first tour on each page targets roughly 3–6 steps, with longer references in the Guide. A feature with several modes may have separate short subsections rather than one long sequence. Every user-facing control gets a written explanation; the introductory bubbles prioritize the controls needed to start.

| Chapter | Short tour focus | Hands-on element |
| --- | --- | --- |
| Home | Starting point or resume action, Moves, lessons, Timer, Guide | Optional navigation after the overview ends |
| Find your route | Answer honestly, understand the recommendation, open the first lesson | Explain controls without submitting invented answers |
| Moves | Holding, symbol and amount, Play/Replay, speed, direction/camera, advanced section | Select U prime and play the turn |
| Lessons | Stage navigation, observation, preparation, formula/current move, playback, self-reported practice | Try one available forward step; explain undo/back |
| Solve your cube | Method, scramble input, six-face entry, orientation, validation, solve trace | Labeled screenshots of input and correction; preserve the current draft |
| Algorithms | Filters, recognition image, holding, algorithm detail, animation, practice selection | Optional expansion of information; no required saved selection |
| Formula practice | Case scope, identify first, reveal, animation, next case | Explain reveal using an example instead of spoiling a live case |
| Timer | Scramble and six-face check, keyboard/touch timing, inspection, history, averages, penalties, export | Read-only explanation and labeled sample records |

The lesson tour adapts to an introduction without a player and to LBL, Beginner CFOP, and Advanced CFOP. It does not switch methods or reset a user's current solve to manufacture a target. Explain the difference between looking around the virtual cube and a real whole-cube rotation that the member must perform.

## 6. Timer and existing-data protection

Timer currently registers document-level keyboard listeners. The tour must explicitly coordinate with those listeners; visual overlays alone are insufficient.

- Do not start a welcome or tour during inspection, arming, running, or an unresolved stopped/saving attempt. Make manual help available again when timing is safely idle. An arrival invitation must also defer while a new scramble is loading or the timer is recovering from an error.
- While the Timer tour is open, suspend timer activation from keyboard and pointer input. Space/Enter operate focused tutorial controls only. Escape exits the tutorial without creating or interrupting an attempt.
- Re-enabling the timer requires a fresh press after all held input is released. Closing a bubble with a held Space key must not arm or start the timer.
- Preserve the current scramble, settings, pending save state, and history. Tutorial steps must not add attempts, +2/DNF penalties, delete records, or trigger downloads automatically.
- Use clearly labeled static sample records for explaining averages, penalties, and trends when personal history is empty. Do not inject those records into the live repository.

Similarly, never overwrite color-entry drafts, change formula practice scope, or check “Mark as practiced.” Directly visiting a lesson may retain the site's existing last-visited behavior; tour completion itself must not change learning progress. For hands-on playback steps, restore tutorial-owned transient selections/playhead where safe on exit, and never overwrite subsequent user edits or restart animation automatically.

## 7. The written Guide

The Guide is a lightweight page readable even if the cube engine or WebGL is unavailable. It must not load the solver simply to render text and images. No tutorial video or large image is loaded automatically before needed.

Structure:

1. A short welcome and “A simple practice routine.”
2. A chapter index: Starting point, Moves, Lessons, Solve your cube, Algorithms and practice, Timer, and Help.
3. For each chapter: when to use it, a real annotated screenshot, a short numbered procedure, a concise control reference, and Open page / Start page tour links.
4. Common questions: orientation, prime and half turns, viewing angle versus regrip, invalid color input, where records are saved, exporting history, and replaying tutorials.

Use production UI screenshots captured from a fresh, isolated browser profile. Use fixed demonstration states and label sample timer records as examples. Do not capture members' personal records, browser chrome, account names, or private tabs. Capture a phone-specific example where controls differ. Screenshots need readable crops, captions, alternative text, and an accessible enlarged view.

Maintain a small screenshot manifest with the route, capture dimensions, demonstration state, and application revision. Re-capture affected images when navigation, labels, or layouts change. Text and buttons remain usable while screenshots load or if an image fails. Links remain within the club shell.

## 8. Video brief

Deliver a 4–6 minute English introduction using real site operation, English narration, and accurate English captions. Aim for a calm, welcoming instructional style with club colors and a short branded opening. Keep menus and cube turns readable. Use restrained zooms, cursor emphasis, and callouts only where they clarify an action.

Proposed five-minute chapter map:

| Approximate time | Scene and purpose |
| --- | --- |
| 0:00–0:20 | Welcome and what a short learning session can accomplish |
| 0:20–0:55 | Find a starting point; show how a returning member resumes |
| 0:55–1:35 | Understand U, U prime, and U2 in Moves; clarify holding |
| 1:35–2:40 | Follow an LBL lesson with a physical cube; pause and single-step |
| 2:40–3:20 | When stuck, find the solve/color-entry tools and read the explanation |
| 3:20–4:25 | Use a scramble, check its diagram, time a solve, and find history |
| 4:25–5:00 | Briefly show future practice tools, local-data/export reminders, and Guide |

Treat these times as an editing budget. Include essential desktop and touch differences without duplicating every action. Do not imply a complete physical solve happens in a few seconds: label time-compressed footage or transition clearly to an example result. Do not promise that the site automatically verifies mastery or synchronizes data across devices.

### Approximately 30-second sample

Before producing the full film, make one narrated, captioned sample showing the real Moves page: briefly establish the brand, select U prime, explain “look directly at the turning face,” play the turn, and connect it to learning at one's own pace. This tests real cube motion, UI legibility, callouts, narration pronunciation, captions, and pacing rather than only a decorative title card.

The owner reviews the sample's visual and audio quality before full-video production. A silent preview can help review composition but does not satisfy sample acceptance. Record full-length footage only after the website tutorial UI has stabilized, so the film and screenshots match the release.

### Production and deliverables

Use the existing browser automation for repeatable operation and screenshots. Evaluate an isolated code-based composition tool such as Remotion for editing; keep media tooling out of the website's runtime bundle. No professional editor or third-party MCP integration is assumed available. Validate capture smoothness and output on this machine before selecting the final recording/render pipeline.

Use a natural English voice with consistent pronunciation: “U prime,” “U two,” “F two L,” and expanded terms on first introduction. Voice-source selection is a sample-production decision: audition an appropriately licensed source, check quality, and obtain approval before paid usage or adding external credentials. This draft does not commit the owner to a paid voice service or editing subscription.

Target a 1920×1080 landscape MP4 at 30 fps or higher, with readable UI, English captions, an SRT caption file, a transcript, and editable/reproducible project sources. Check motion in the rendered file rather than assuming that a higher export frame rate improves low-frame-rate capture. Supply a captioned viewing copy and retain a clean master. Optional quiet licensed music must never obscure narration; clear speech takes priority over music.

The initial video deliverable is local files for owner review and sharing. Selecting an online video host, uploading publicly, and embedding the final video are a separate publication decision after the full film is accepted. The Guide ships with complete text and screenshots; it must not show a broken player or a coming-soon video placeholder. Once the owner chooses distribution, a verified Watch video entry can be added.

## 9. Architecture and boundaries

- **Tutorial content:** stable chapter/tour/step IDs, short bubble text, target IDs, action conditions, related Guide sections, and tutorial content versions.
- **Tour state:** current tour and step, completion/skip state, remembered invitations, and explicit start/resume/restart/exit actions. No business-data writes.
- **Page integration:** register real target readiness, safe interaction completion, and busy-state constraints. Shared components expose optional integration points without depending on club branding.
- **Tour presentation:** focus management, placement, highlighting, responsive behavior, and reduced motion. Clean up listeners and overlays on exit/unmount.
- **Guide content and assets:** chapter text, current screenshots, routes, and tour entry links. Keep static content independent from the cube engine.
- **Media production:** script, capture scenarios, narration, captions, and composition sources separate from website runtime code.

The global site receives no new tutorial invitations, navigation items, storage, or branding. Shared-component changes must retain its current behavior. Do not change solving rules, algorithms, timing calculations, or data-storage formats to implement onboarding.

## 10. Verification and acceptance

Before claiming the website tutorial is complete:

- Verify welcome choices, later reminders, page invitations, resume/restart, versioned state, and unavailable/corrupt storage.
- Verify real action completion, Skip/Back/Exit, browser navigation, delayed targets, missing targets, engine failure, and cleanup after exit.
- Verify desktop keyboard use, phone touch use, narrow layouts, zoom, visible focus, reduced motion, and no bubble covering its required control.
- Verify the timer input lock, held-key release, all busy phases, and unchanged history/settings/scramble. Verify unchanged color drafts and no tutorial-generated practice marks or selections.
- Cover both introduction and playable lessons across the three available methods, plus all listed club feature pages.
- Verify Guide routes, screenshot content/captions, readable phone views, and operation without WebGL.
- Run focused unit/component and browser tests, type checking, build, console checks, and relevant existing regressions. Broaden testing when shared changes warrant it.

For the sample and final film, inspect the exported media rather than only the composition preview: correct UI and moves, smooth readable motion, synchronized narration/captions, no clipped audio, adequate reading time, clear chapter transitions, and no personal data. Listen through the entire final narration and review caption spelling and timing. Record media and source revisions in the delivery notes. Owner sample acceptance precedes full-film production; owner final-film acceptance precedes online publication.

## 11. Delivery order and exclusions

1. Review this written design, then write and review the implementation plan.
2. Implement and verify the club tour system and written Guide.
3. Capture the final screenshots and produce the narrated 30-second sample.
4. After sample acceptance, complete the 4–6 minute film and review its final export.
5. Deliver the files; agree on video distribution before uploading or adding a hosted-video entry.

Excluded: tutorial analytics, accounts, cloud sync, quizzes that score onboarding, forced tours, a generic no-code tour editor, a full cube-solving video course, a global-site tutorial, and automatic media publication. Existing public-site release and GitHub integration should be addressed explicitly in the implementation/release plan rather than treating this draft as a deployment instruction.

## 12. Sources and existing code observations

- `src/club/ClubApp.tsx` owns club routing and currently enables the cube engine for most feature routes; Guide must be excluded from engine-dependent rendering.
- `src/club/learning/ClubLearnPage.tsx` records lesson visits and explicit practice marks; tutorial progress must stay separate.
- `src/club/timer/use-timer.ts` registers document keyboard handlers and timing lifecycle events; tutorial input needs deliberate coordination.
- [Playwright video recording](https://playwright.dev/docs/videos) describes configurable browser video capture. Recording quality still needs a local sample check.
- [Remotion documentation](https://www.remotion.dev/docs/) provides an option for a code-based video workflow; no new tool is installed by this document.
- [OpenAI MCP overview in the plugin quickstart](https://developers.openai.com/plugins/build/app-quickstart) explains exposing capabilities through tools. It does not establish a working integration with any particular video editor.
