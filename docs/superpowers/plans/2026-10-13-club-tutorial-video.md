# Club Tutorial Video Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver an approximately 30-second narrated sample, then a 4–6 minute English website tutorial after the owner accepts the sample.

**Architecture:** Record verified website scenes from isolated browser contexts, retaining capture provenance. A separate code-based composition project adds restrained club branding, zooms, callouts, narration and synchronized captions. Keep editable sources and clean/captioned exports outside the website runtime and preserve large media before any worktree cleanup.

**Tech Stack:** Node 24+, existing Playwright capture helpers, an isolated Remotion/React composition package with versions pinned at installation, and a chosen English narration source. Existing local inspection found Microsoft Zira Desktop (en-US); it has not been auditioned and is not an accepted final voice. No voice-generation connector or editor MCP integration is currently verified.

**Spec:** [Approved club tutorial design](../specs/2026-10-13-club-tutorial-design.md), sections 8, 10 and 11.

**Status and order:** Approved by the owner on 2026-10-13 for Native implementation. Preserve Native execution. Task 8 follows the stabilized website from [Tasks 6–7](2026-10-13-club-tutorial-guide.md). Task 9 ends at owner sample review. **Do not start full-film Task 10 until the owner accepts the narrated sample.** Initial video delivery is local; hosting/upload/embedding remains a separate later decision as approved in the spec.

## Global Constraints

- Deliver a 4–6 minute English introduction using real site operation, English narration, and accurate English captions.
- The owner reviews the sample's visual and audio quality before full-video production.
- A silent preview can help review composition but does not satisfy sample acceptance.
- Target a 1920×1080 landscape MP4 at 30 fps or higher, with readable UI, English captions, an SRT caption file, a transcript, and editable/reproducible project sources.
- Supply a captioned viewing copy and retain a clean master.
- Do not imply a complete physical solve happens in a few seconds: label time-compressed footage or transition clearly to an example result.
- No professional editor or third-party MCP integration is assumed available.
- Voice-source selection is a sample-production decision. Obtain approval before paid usage or adding external credentials.
- Selecting an online video host, uploading publicly, and embedding the final video are a separate publication decision after the full film is accepted.

## Review Focus

1. A nominal 30 fps export can contain jerky duplicated capture frames; inspect the actual U prime turn and cursor movement before accepting the pipeline (Tasks 8–9).
2. Spoken U prime/U two, captions and the displayed move must agree, including outside-face direction and camera-versus-regrip meaning (Tasks 8–10).
3. Captions or callouts can cover the target control or become unreadable on phones; check exported crops and safe areas, not only editor previews (Tasks 9–10).
4. Missing narration, clipped peaks, incorrect timing or stale revision metadata must fail media validation instead of producing a superficially complete video (Tasks 8–10).
5. Export files ignored by Git can disappear during cleanup, or capture can accidentally include personal data; use isolated browser contexts and a verified final archive manifest (Tasks 8–10).

## File map and output locations

| Files | Responsibility |
| --- | --- |
| New `media/club-tutorial/package.json`, lockfile, `tsconfig.json`, `README.md`, `licenses.md` | Isolated video dependencies, reproducible commands and asset provenance |
| New `media/club-tutorial/src/types.ts`, `validate-edit.ts`, `validate-edit.test.ts`, `captions.ts`, `captions.test.ts` | Timeline/caption contracts and output checks |
| New `media/club-tutorial/scripts/capture.mts`, `render.mts`, `validate-output.mts` | Actual browser recording, rendering, exported-file verification |
| New `media/club-tutorial/src/Root.tsx`, `TutorialFilm.tsx`, `Callout.tsx`, `Captions.tsx` | Branded composition with real footage |
| New `media/club-tutorial/content/sample-script.md`, `sample-edit.json`, `full-script.md`, `full-edit.json` | Narration, scene timing and editable chapter structure |
| New `docs/validation/club-tutorial-video.md`; existing `.gitignore` | Audition/sample/final acceptance evidence and generated-file exclusions |

Generated media lives in `media/club-tutorial/public/captures/`, `public/narration/`, and `output/`, ignored by Git. The final archive lives outside the Git checkout at `D:/Projects/Cubing Calculator/validation/club-tutorial-video/`, with sample/final version subdirectories and SHA-256 manifests. Sources and scripts are committed; no credentials or giant rendered video is placed in Git history. The website build must not import or install the media package.

### Task 8: Repeatable capture pipeline and narration audition

**Files:** Create the isolated package/configuration, contracts, capture script, validation tests and sample script listed above. Modify `.gitignore`; begin `docs/validation/club-tutorial-video.md`.

**Interfaces:**

- `CaptionCue = {startMs:number; endMs:number; text:string}`; `MediaClip = {id:string; src:string; startFrame:number; durationFrames:number; trimBeforeFrames:number; captureRevision:string; exampleData:boolean}`; `Callout = {clipId:string; startFrame:number; endFrame:number; target:{x:number;y:number;width:number;height:number}; text:string}`; `VideoEdit = {kind:'sample'|'full'; width:1920; height:1080; fps:number; durationFrames:number; clips:MediaClip[]; narration:{src:string; durationMs:number; voice:string; source:string}; captions:CaptionCue[]; callouts:Callout[]}`. Coordinates are in the recorded source viewport; composition transforms them with the footage.
- `validateEdit(edit:VideoEdit):string[]` reports missing voice/clip source, invalid dimensions/times, frames outside duration, unordered or overlapping cues, excessive cue density and invalid callout bounds. Captions are normally 1–2 lines, at most 42 characters per line and at most 20 visible characters/second; exceptions require a documented editorial reason and visual review.
- `captureScene({baseUrl:string,scene:string,outputDir:string,sourceRevision:string}):Promise<{videoPath:string; eventsPath:string; sourceRevision:string}>` in `capture.mts` consumes Task 7's `prepareTutorialScene`. It owns a fresh browser context, records action timestamps/target rectangles, and finalizes video by awaiting context close.
- Package commands: `npm.cmd --prefix media/club-tutorial run capture -- --scene sample --base-url <local-built-site>`, `test`, `typecheck`, `render -- --edit content/sample-edit.json`, and `verify -- --edit content/sample-edit.json`. Root website scripts remain unchanged by media tooling.

- [ ] Write focused tests `rejects a missing narration track`, `rejects a cue past the final frame`, and `rejects a callout outside its source viewport`. Use a valid 30-second fixture, then assert:
  ```ts
  expect(validateEdit({ ...valid, narration: { ...valid.narration, src: '' } }))
    .toContain('narration: source required');
  ```
  Run the isolated test command after dependency setup; establish red for the missing validator before implementing it. No mirrored tests for decorative styles.
- [ ] Read current official Remotion installation/render documentation and license, record the suitability for this authoring use, and pin mutually compatible versions in this isolated package/lockfile. If that use requires a paid license, resolve it with the owner before installation. Configure H.264/AAC output through its supported local render pipeline; use managed/project-local binaries instead of assuming FFmpeg is on PATH. Run an installation/typecheck smoke check; record the actual versions. Do not install a professional GUI editor or configure unverified MCP servers.
- [ ] Implement the validator and capture contract. Record a short real U prime selection/playback from the built Moves page, using the exact 1920×1080 viewport and matching recording size. Wait for the actual rendered cube frame. Inspect native capture metadata and frame cadence; if the default recorder is below 30 fps or visibly jerky, use a verified browser frame-capture/encoding path for the same real page and test a short turn again. Exporting duplicated frames at a higher nominal rate is not a quality fix. Limit feasibility retries to two materially different paths, then report the concrete limitation and retain the usable footage/source.
- [ ] Write a 55–70 word sample narration with short pauses: welcome, choose U prime, look directly at the upper face, observe the counterclockwise turn, then try it on a cube. Caption the visible token as U′ and say “U prime.” Produce a short audition from an available appropriately licensed voice; the installed system voice is a temporary audition candidate only. If it is not natural/clear enough, present a specific higher-quality voice option and any cost/access requirement before using it. A supported option to evaluate is the official OpenAI speech API; re-check current model/voice documentation at execution, and disclose synthetic narration in the delivered credits when applicable. Do not substitute a silent or robotic scratch track and call it accepted quality. Prepare visuals/tests while voice selection is pending.
- [ ] Run isolated tests/typecheck, inspect the captured turn and audition pronunciation/pacing, and record the selected pipeline/voice or precise unresolved dependency. Commit sources as `build: add isolated tutorial video capture tooling`. Continue to rendering only when a usable narration file exists; website release work remains independent.

### Task 9: Branded 30-second sample and owner quality review

**Files:** Create composition components, `captions.ts` and its tests, `render.mts`, `validate-output.mts`, `content/sample-edit.json`; extend validation notes.

**Interfaces:** `buildSrt(cues:readonly CaptionCue[]):string`; `TutorialFilm({edit:VideoEdit,burnCaptions:boolean})` renders footage, callouts, voice, and optional captions at the requested timing. `renderFilm({editPath:string,outputDir:string,burnCaptions:boolean}):Promise<{mp4:string;srt:string}>` renders through the isolated package. `validateOutput({edit:VideoEdit,mp4Path:string,srtPath:string}):Promise<string[]>` checks actual file streams/duration/dimensions, nonempty audio and captions, and clip provenance. It must report checks it cannot perform instead of treating them as passed.

- [ ] Write a caption boundary test that rounds milliseconds correctly and produces ordered SRT intervals, and an output test using a deliberately silent small fixture that reports missing/nonempty-audio failure. Run `npm.cmd --prefix media/club-tutorial test`; establish red for the missing behavior.
- [ ] Implement the composition and render pipeline with a 2–3 second club opening, an unhurried real Moves demonstration and a short closing invitation. Keep genuine sticker colors, source labels and move direction. Match callouts to recorded target rectangles; use smooth camera crops only when they improve legibility. Keep subtitles in a stable lower safe area, away from the demonstrated control, with at least 36 px text at 1080p and sufficient contrast. Prefer clear narration without music for the first sample. Include “AI narration” in credits if the chosen track is synthetic. No generated imitation of the website UI.
- [ ] Render a clean master and captioned sample, targeted at 30 seconds (acceptable 25–35 seconds), plus SRT and transcript. Run package tests/typecheck and `verify`; require 1920×1080, at least 30 fps output, audible complete narration, duration matching the edit within one frame, no captions past the ending, and no broken media sources. Inspect the actual exported beginning, every cut/callout and the full cube turn; listen to the entire sample. Check a phone-sized viewing window as well as full screen. Record both automated evidence and subjective issues honestly.
- [ ] Archive the MP4 copies, SRT, narration, capture/event files, script, edit JSON, sources/lockfile and validation notes outside the worktree. Verify archive checksums and reopen the captioned archive copy. Commit reproducible source changes as `feat: compose the club tutorial sample`; link/embed the sample for the owner. Ask them to judge voice, pacing, legibility and overall style. Do not advance to Task 10 without explicit sample acceptance; if revisions are requested, revise this sample and update its archived version.

### Task 10: Full 4–6 minute film after sample acceptance

**Prerequisite:** Record the owner's accepted sample version in validation notes. This task is planned now but cannot start from implementation-plan approval alone.

**Files:** Create `content/full-script.md`, `content/full-edit.json`; extend capture scene definitions and validation/delivery notes. Reuse Task 9 components and pipeline.

**Interfaces:** Reuse `VideoEdit`, `captureScene`, `renderFilm`, `validateOutput`, and `buildSrt` unchanged. Add `content/chapters.json` entries `{title:string,startMs:number}` in ascending order and include them in the final delivery.

- [ ] Write the complete approximately five-minute script following the seven approved chapter budgets: 0:00 welcome, 0:20 starting point, 0:55 Moves, 1:35 lessons, 2:40 solving help, 3:20 Timer, 4:25 next steps/Guide. Verify claims against the released UI and preserve the accepted sample style/voice. Explain local-only records and export briefly; mention advanced tools without turning the introduction into a full CFOP course. Include both keyboard and touch timing differences and clarify any example/time-compressed solve.
- [ ] Capture each scene from the stabilized source revision in isolated contexts; label synthetic result examples. Use real selection/typing/playback and clean deliberate cursor paths. Produce narration in short segments, check pronunciation, then align edits and captions to the actual speech. Preserve the sample's 1080p and motion standards. Optional music is admitted only with documented reuse rights and a mix where every spoken word stays clear.
- [ ] Run media tests/typecheck and validate the full edit, chapter order and exported files. Require 240–360 seconds, 1920×1080, at least 30 fps, synchronized captions and a complete audio stream. Watch/listen end to end, then review phone-scale legibility, every notation example and every demonstrated click against the real page. Do not claim listening verification if the execution environment cannot play/analyze the audio; provide the audio for owner review and label that limitation.
- [ ] Deliver the captioned MP4, clean master, SRT, transcript, chapter list and editable sources; copy all dependencies/assets needed for reproduction into the versioned archive with license/provenance notes and checksums. Commit source updates as `docs: deliver the club website tutorial film`. Ask for final-film review and distribution preference using the concrete finished video. No host account, public upload or Guide video link is created before that decision.

## Official references checked during planning

- [Playwright recording](https://playwright.dev/docs/videos): exact viewport/recording size and closing the context matter; this does not guarantee suitable native frame cadence.
- [Remotion renderMedia](https://www.remotion.dev/docs/renderer/render-media) and [license](https://www.remotion.dev/license): validate the chosen local tooling/usage at execution rather than assuming an installed editor integration.
- [OpenAI speech documentation](https://developers.openai.com/api/docs/guides/text-to-speech): an optional voice source, not an already connected or funded capability; follow its synthetic-voice disclosure requirement if used.
