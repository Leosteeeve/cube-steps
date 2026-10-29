# Editorial film publication

Spec: the owner accepted direction A (30-second interest film and five-minute operational guide, English prompts, no narration, retained closing) and on October 28 authorized fixing the crop-check minor, publishing both films, PR/checks/merge/Pages and clean local synchronization.

## Constraints and decisions

Preserve accepted video bytes and historical Releases. Solver Preview/Experimental and physical ergonomics remain unchanged. No new dependencies or route changes. Guide keeps the full film selected initially, with two ordinary pressed-state buttons selecting one film at a time; switching unloads playback and requires a new explicit Watch action. Both films have downloads and written prompts. This adds the previously sharing-only short film without another homepage section.

## Task 1 — Crop validation

Extract the previous keyframe lookup into a pure helper, add a failing moving-crop regression, then implement the renderer's clamped cubic in/out interpolation. Share the same helper between the editable renderer and checker; check every frame of the pre-click highlight window. Commit the reusable geometry and regression cases. Prove numerical equivalence to the old renderer across the existing timeline and recheck current captures, avoiding an unnecessary re-encode.

## Task 2 — Two-film website integration

Add failing UI/publication tests for both accepted assets and switching/error behavior. Publish new versioned Release assets, independently download and hash them, update the preparation pipeline and metadata, posters, prompts, credits and manifests. Keep earlier Releases untouched. Run focused unit/browser checks, typecheck, formatting and production build; inspect desktop/mobile player screenshots and playback/seeking in Chromium and WebKit.

## Task 3 — Review and publication

Run applicable full tests and one fresh independent whole-change review. Resolve findings, commit/push and create one PR. Wait for checks on the reviewed head and remote review guards; merge that exact head. Dispatch Pages once with publish_preview=true, teaching_accepted=false. Wait for main CI and Pages; verify exact live revision, both hashes/range responses, playback and UI. Fast-forward clean primary main, archive ignored ledgers/artifacts with hashes, remove only this owned merged worktree and branch. Report live links and verification.

Interfaces: Task 1 exports cropAtTime/checkEventCrop consumed by editable renderer/checker; Task 2 keeps manifest hashes identical to accepted exports; Task 3 verifies the same assets and reviewed Git SHA. Generated media is ignored, never committed.
