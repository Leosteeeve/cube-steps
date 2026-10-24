# Club Films and Final Publication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update both accepted no-narration films to the new website, then publish the accepted full film in Guide without breaking old assets.

**Architecture:** Capture the verified Task 22 revision and edit new copies of the existing Remotion sources. Keep recordings/renders in workspace media folders; track the integration manifest, original prompts, credits and verification evidence in the repository. Publish immutable release media before merging code that downloads it.

**Tech Stack:** Existing Remotion/Chromium/FFmpeg toolchain, Node.js, current Guide checksum loader and GitHub Release/Pages workflow. No new editor, speech service or production dependency.

**Spec:** [Approved design](../specs/2026-10-23-advanced-roux-and-ui-design.md), Sections 12–13; [overview](2026-10-23-roux-ui-upgrade-plan.md). Tasks 23–26 of 26, after the verified website release in Task 22.

## Global Constraints

- No spoken narration. Use music, modest effects and short English prompts, following the accepted film style.
- Short: around 30 seconds, 1080p H.264/AAC, email-friendly copy targeting under 10 MiB. Full: 4–6 minutes.
- Capture real operation at actual displayed turn speed. No prototype search results, fake testimony or unexplained sped-up cube turns.
- Preserve the closing composition and wording: “Your turn. Keep your curiosity.”
- Review the revised short cut before producing the full film; accept the full film before replacing the Guide video.
- Keep existing accepted files/release assets intact. Do not send email. Website entry never autoplays video or audio.

## Review Focus

- A later website revision makes filmed controls or instructions stale — Tasks 23–25.
- A fast prompt/crop obscures the action a novice must follow — Tasks 23–24.
- Silent source footage accidentally includes narration or the edited soundtrack clips — Task 24.
- The new player points at an absent/unverified asset or an unaccepted render — Tasks 25–26.
- Mobile playback/download fails despite successful local rendering — Tasks 25–26.

---

## Artifact and source map

Workspace paths below are relative to `D:/Projects/Cubing Calculator`, not the repository:

- Existing sources, read only: `sharing/club-website-introduction/no-narration-v3/source/` and `sharing/club-website-introduction/full-no-narration-v1/source/`.
- New short deliverable: `sharing/club-website-introduction/roux-refresh-short-v1/`.
- New full deliverable: `sharing/club-website-introduction/roux-refresh-full-v1/`.
- Each new folder contains `source/`, `public/`, `qa/`, `CREDITS.txt`, `README.md` and final MP4s. Preserve editable source and captured footage when cleaning worktrees.
- Use the verified existing Remotion modules under `validation/club-tutorial-video/full-v1/source/media/club-tutorial/node_modules` through the inherited render script. Resolve/verify the executable before rendering; do not silently replace versions or install professional software.
- Repository integration: `scripts/tutorial/guide-video.json`, `prepare-guide-video.mts`, `src/club/guide/GuideVideo.tsx`, `video-transcript.json`, `public/club-guide-video/`, and new `docs/media/roux-refresh/` text/manifest evidence. Large MP4s remain release assets, not Git objects.

### Task 23: Real captures, storyboard and revised short cut

**Files:** Create the new short workspace folder with `source/{Film.tsx,story.ts,capture.mjs,render.mjs,verify.mjs,captures.json}` and credits. Create repository `docs/media/roux-refresh/{storyboard.md,capture-manifest.json,README.md}`. Extend existing tutorial capture fixtures only if a reusable scenario is needed; do not change solver behavior for filming.

**Interfaces:** `CaptureRecord={id:string;sourceRevision:string;url:string;scenario:string;file:string;sha256:string;width:number;height:number;fps:number;durationSeconds:number;inputFingerprint?:string;routeId?:string}`. Manifest is `{version:1;sourceRevision:string;captures:CaptureRecord[]}`. `capture.mjs --base-url=<verified local production URL> --revision=<commit>` refuses a build-info mismatch; `verify.mjs --source-only` validates referenced captures, hashes, timeline coverage, safe crops and prompt timing before rendering.

- [ ] **Prepare the storyboard and capture checks.** Short sequence: curiosity/home → learn and manipulate a real move → personal solving/practice → brief Roux discovery → Guide destination and closing. Show an actual verified route and the Preview/Experimental labels when visible. Keep the current accepted style, not a second visual redesign. Negative fixtures deliberately use the wrong revision, missing capture and out-of-frame crop; the verifier must reject each.
- [ ] **Capture the verified production build.** Use a clean demo browser profile, deterministic safe input and original demo records; omit real member notes/names. Record source revision and footage hashes. Search waits may be cut with a visible time transition; capture turns at 1× and never fabricate result latency.
- [ ] **Render and inspect** using `node <new-short>/source/verify.mjs --source-only`, then `node <new-short>/source/render.mjs`. Inspect every shot and the actual final encoded opening/closing. Verify H.264/AAC, 1920×1080, 30fps, complete decode and roughly 30 seconds. Create `Webb-Cubing-Club-Intro.mp4` and, if needed, `Webb-Cubing-Club-Intro-Email.mp4`; verify the email copy is under 10 MiB and remains readable.
- [ ] **Present the concrete short film for owner review.** Save the chosen cut and feedback in `docs/media/roux-refresh/README.md`. Do not begin the full edit until the short cut is accepted; unrelated website fixes may continue without changing the filmed revision unnoticed.
- [ ] **Commit** storyboard/capture metadata/acceptance record only: `git commit -m "docs: record refreshed club film captures and short-cut acceptance"`. Keep the MP4/editable workspace source available through absolute links.

### Task 24: Four-to-six-minute full walkthrough

**Files:** Create the new full workspace folder with `source/{Film.tsx,story.ts,render.mjs,verify.mjs,inspect.py,contact.py,captures.json}`, `public/` captures/audio, `English-on-screen-guide.txt`, `chapters.txt`, `CREDITS.txt`, `README.md`; update repository storyboard/capture manifest and create `docs/media/roux-refresh/film-manifest.json`.

**Interfaces:** `FilmManifest={version:1;sourceRevision:string;durationSeconds:number;frames:number;fps:30;width:1920;height:1080;bytes:number;sha256:string;voice:false;chapters:readonly {start:number;title:string}[];prompts:readonly {start:number;end:number;text:string}[];credits:readonly {name:string;url:string;license:string;edits:string}[]}`. Verification writes `qa/verification.json` and frame/contact evidence, separately identifying automated checks and manual review. Build the on-screen guide/transcript from the same timed prompts.

- [ ] **Adapt the accepted full source to this flow:** find a suitable route, Moves/one lesson, follow a personal cube using text or color input, practice/Timer, then an optional Advanced Roux/Lab introduction. Target about five minutes inside 240–360 seconds. Keep CMLL scoring details in the written Guide. Preserve the original closing composition; remove obsolete controls/copy.
- [ ] **Verify source contracts before rendering.** Timeline contiguous, chapter/prompt times monotonic and in bounds, all captures from the declared revision, actual turn speed unchanged, music/SFX assets credited and source footage muted. Use at most six words per second as an automated rejection ceiling, then manually allow more recognition time; numeric compliance alone does not establish readability. Deliberately corrupt one cue/capture in test fixtures and confirm rejection.
- [ ] **Render** `Webb-Cubing-Club-Guide-Roux-Refresh.mp4` using the existing pinned toolchain and accepted visual style. Reuse cleared audio with its license/edit record; if a new track is proposed, verify its source/license before inclusion. No synthesized or recorded voice is added.
- [ ] **Inspect the whole encoded film.** Run the adapted full decode/audio/frame verifier, check no clipped samples, unintended silent interior gaps, black/missing shots or overflowing prompts. Review actual beginning, each action, section boundary and ending at desktop and phone display sizes. Record subjective music balance separately from PCM/codec checks; do not claim a listening review from waveform analysis alone. Save actual byte size, duration, hashes, chapters and prompts.
- [ ] **Present the full film for owner acceptance**, with local download and compact verification notes. Keep the old Guide film active until explicit acceptance. Record acceptance and any required revisions in the media README.
- [ ] **Commit** the final text/manifest/credit evidence: `git commit -m "docs: finalize accepted no-narration club walkthrough"`.

### Task 25: Accepted-film Guide integration and local production verification

**Files:** Modify `scripts/tutorial/guide-video.json`, `prepare-guide-video.mts`, `src/club/guide/GuideVideo.tsx`, `video-transcript.json`, `video-asset.test.ts`, `GuidePage.test.tsx`; add `public/club-guide-video/poster-v3.webp`, update `CREDITS.txt`, `public/club-guide-video/README.md` and `.gitignore` for the ignored downloaded MP4; extend existing `e2e/guide-video.spec.ts` and `e2e/guide-video-production.spec.ts`. Update repository media README with accepted hash and delivery metadata.

**Interfaces:** Retain existing `{url,bytes,sha256}` download manifest/`prepareGuideVideo` API. New immutable release tag `club-guide-video-v3`, asset `club-guide-video-v3.mp4`; inspect the remote tag first, and if already occupied choose the next unused numeric version consistently across filenames/URL/poster/tests. Never replace an existing asset. Player/download/transcript metadata must come from the accepted FilmManifest rather than assumed five-minute/36MB text.

- [ ] **Write focused integration tests:** no media request/autoplay before play, accepted filename/hash match, corrupt bytes rejected before installation, verified local reuse works offline, download/transcript/credits reflect the final render, and failed media retains written instructions. Existing asset-verification tests remain intact.
- [ ] **Run red:** `npx.cmd vitest run src/club/guide/video-asset.test.ts src/club/guide/GuidePage.test.tsx`; confirm new accepted-media expectations fail before edits.
- [ ] **Integrate accepted local bytes** using the loader's verified local-cache path; update poster, actual duration/download size, on-screen transcript and credits. Preserve click-to-play, accessible error handling, chapter links and the complete written Guide. Keep original release metadata in history; do not place a large MP4 in Git.
- [ ] **Verify local production:** focused tests, typecheck, build and video browser specs on Chromium/WebKit using the actual `/cube-steps/club/` base. Confirm metadata load, seeking near the ending, pause, mobile sizing, download hash and old Guide routes. Required full tests will run on the final PR; do not claim live deployment yet.
- [ ] **Commit** only reviewed integration/text/poster changes: `git commit -m "feat: update club Guide with the accepted Roux walkthrough"`.

### Task 26: Immutable media publication, final review, merge and synchronization

**Files:** Update `docs/media/roux-refresh/README.md` and `docs/validation/2026-10-23-advanced-roux.md` with truthful publication/verification evidence. Workspace `validation/advanced-roux-upgrade/media-publication/` holds large responses/screenshots/download verification, not credentials.

**Interfaces:** Release asset SHA-256 and bytes equal the accepted manifest; Pages build revision equals merged reviewed code. Retain the old release URL. Follow the same reviewed-head/checks/Pages/local-sync flow as Task 22.

- [ ] **Independent integration review:** review the media diff and acceptance/hash evidence using the preserved Native workflow. Confirm no website changes after capture invalidate the film; if controls changed, replace affected footage and re-review that portion before publication.
- [ ] **Publish immutable accepted media** through the existing authorized GitHub release process. Check prior tag state, upload once, download independently and match bytes/hash. Recover an ambiguous upload by inspecting existing assets instead of duplicate creation/overwrite. This occurs before CI needs the new manifest URL.
- [ ] **Submit and merge reviewed code:** push/create PR, attach it to the chat, await all required checks, address findings and merge only the reviewed current head. Dispatch the existing Pages workflow with the truthful Preview/teaching-acceptance flags from Task 22; do not bypass checks or guess deployment success.
- [ ] **Verify live delivery:** inspect Pages result/build-info, Guide poster, click-to-play, seeking and closing, MIME/range response, transcript/credits/download bytes/hash, desktop/phone screenshots and console errors. Check the original release asset remains available. If deployment fails, retain the old working site and diagnose; do not report publication complete.
- [ ] **Synchronize and clean:** preserve unrelated changes, fast-forward primary main, verify `HEAD` equals `origin/main` and clean status, then archive/remove only merged disposable worktrees/branches. Preserve both new editable media folders and QA artifacts outside cleanup targets. Do not remove a tree with unreviewed/unsaved work.
- [ ] **Report** club/global/Guide URLs, both media file links, PR and live verification status; distinguish pending ergonomic/physical acceptance. The owner shares the email copy; no automatic email. End with the actual delivered status and any remaining acceptance item.
