# Guide video publication

Owner decision: on October 13, 2026, after accepting the full film, publish the English-captioned version inside the club Guide. Retain the accepted 30-second Moves sample as a member-email attachment, with email text pointing to the full Guide. This supersedes the earlier local-only distribution choice. No email sending or recipient selection is authorized by this change.

## Delivery

The Guide adds a responsive, native video player above the eight existing written chapters. A poster button starts loading; neither the film nor the cube engine is needed to read the Guide. Native controls provide playback, seeking, volume and fullscreen where supported. A download alternative, expandable transcript, and an explicit error message keep help available if playback fails. No third-party embed, new account, analytics, or runtime dependency is added. Global navigation and teaching acceptance status are unchanged.

The accepted 300-second, 1080p, 30 fps captioned MP4 is preserved byte-for-byte:

- Bytes: `37113286`
- SHA-256: `06ab40927640d0f54419df57407148de0501fe84a673f927119a5e928fa93ed9`
- Release tag: `club-guide-video-v1`, anchored to the existing accepted UI commit `3c2a54706e1f212728c1549d7a63dd18c510fe9f`.

The Release stores the binary outside Git history. Development/build preparation downloads it once, verifies size and SHA-256, and reuses only a valid cached file. A mismatch or failed download stops the build. Pages serves the verified copy with the website. Replacing this film requires a new versioned asset and hash, not silently overwriting the accepted release.

The sealed local media archives remain unchanged. Sharing files and publication receipts are preserved separately under `D:/Projects/Cubing Calculator/sharing/club-website-introduction/` and `validation/guide-video-publication/`.

## Verification

Baseline: the existing Guide component tests passed before editing. The new browser tests first failed because the video entry did not exist. Verification covers click-to-load behavior, actual 300-second playback/seek, desktop and phone widths, transcript access, unavailable-media recovery, and existing Guide chapter/tour navigation. The download test rejects a same-length altered file and verifies offline cache reuse.

Windows sandbox restrictions initially blocked Vite worker realpaths and loopback fetches; normal-host reruns are the authoritative results. Windows WebKit media requests bypass Playwright route interception, so the failure test uses an actual missing media URL, not a simulated route abort. Media duration and progress are checked in the real browser.

Release CI, independent review, deployment, and live media verification are recorded in the PR and the local publication receipt. No film re-render or subjective audio acceptance is inferred from website tests; the owner has already accepted the original film.
