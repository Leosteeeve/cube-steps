# Find your route: learning preferences

The club questionnaire previously asked students to recognize method names and abbreviations before recommending a method. The owner requested ordinary questions about remembering move sequences and understanding how moves work. The owner explicitly chose LBL as the first route for students who cannot solve independently, with Roux explained as a possible later route for learners who prefer fewer memorized sequences and more exploration.

## Bounded change

- Ask memorization and understanding preferences separately. A student may enjoy both; neither answer measures ability.
- Keep six questions for new solvers. Independent solvers get one additional, plain-language experience check, with an unfamiliar/unsure option.
- Introduce method names in the result or voluntary course chooser. Explain what each route does and why it is suggested.
- Preserve explicit readiness requirements for advanced courses. Preferences alone cannot qualify a student for them.
- Preserve skip, manual choice, keyboard navigation, Back, route links, Preview labels and saved learning progress. Answers remain in page memory only.
- Update written Guide and tour descriptions and the quiz screenshot. The accepted film stays unchanged; its older questionnaire images are illustrative, while the written Guide describes the current flow.

## Recommendation decisions

New solvers always start with LBL. For independent solvers, fewer sequences plus an exploratory/mixed learning preference suggests Beginner Roux. An undecided memorization preference plus an exploratory preference also suggests trying Roux. A preference for guided instruction suggests Beginner CFOP. Enjoying both remembering sequences and exploring ideas is neutral: use existing foundations where known, otherwise start with Beginner CFOP and offer Roux as an alternative.

Advanced routes require the existing experience check and an advanced goal. A remembered foundation is cleared if the ability answer is changed. Changing to a new solver also hides the experience question, so a stale answer cannot promote a beginner. Existing callers without the new preference answers retain their earlier recommendation behavior; no persisted profile schema is changed.

This is a starting suggestion, not a claim that a learning preference predicts aptitude or solve speed. Both routes explain how moves work. Fewer memorized sequences does not mean no memorization.

## Verification scope

Recommendation fixtures cover novice safety, independent learner preferences, mixed/uncertain answers and advanced prerequisites. Component checks cover keyboard completion, Back, changing ability, skipping, manual override and answer privacy. Browser checks cover desktop/mobile layouts, the novice result, the advanced Roux route and the page tour. Type checking, build and the unit suite are run before delivery.

## Verified result

- The source unit suite ran 1,086 tests: 1,084 passed in the sandbox, while the two local HTTP video-asset cases failed because loopback requests were blocked. Both unchanged cases passed outside the sandbox. An earlier sandbox run could not load temporary transformed modules; the completed run used a workspace-local temporary directory.
- Independent review identified one mixed-preference mapping issue. A new regression reproduced it before the correction; the final focused run passed 66 tests across 15 files, including that regression. The review then reported no remaining findings.
- Six Chromium/WebKit browser checks passed for the novice questionnaire, advanced Roux recommendation and quiz tour. Desktop and phone screenshots were visually inspected with no clipped controls or horizontal overflow.
- The final type check and production build passed. The existing large-bundle warning remains. The updated Guide screenshot and its manifest passed verification.
- No solver code, persisted progress schema or accepted video was changed. This record covers the local revision, not a GitHub Pages deployment.
