# Guide video v2 publication

Owner decision, October 21, 2026: replace the club Guide's narrated film with the accepted five-minute edit using music, occasional sound effects and English on-screen instructions. Keep the original film's closing. Submit through GitHub review, merge, publish to Pages and synchronize the local checkout.

## Accepted media

- Duration: 300.011 seconds; 1920 × 1080, 30 fps, H.264/AAC.
- Bytes: `36235906`.
- SHA-256: `dbe35d78dedb27d9096f1c4f73938059848a4a16494eb65b74fce3fa5b5567b1`.
- New immutable Release: `club-guide-video-v2`; asset `club-guide-video-v2.mp4`.
- The accepted file is copied without re-encoding. The v1 Release is retained.

The existing download-and-hash verification prepares the new asset for development and builds. Pages serves that verified copy. The old generated local cache is removed so both films are not bundled into the new site.

## Guide changes

The responsive native player remains click-to-load, with playback, seeking, volume, download and error recovery. Visible copy and the accessible player label describe no narration. The new poster comes from the accepted export. The expandable text guide and timed text companion are generated from the new film's action cues, with example-context notes and the original closing. Old spoken text is replaced.

Music is Scott Buckley's “Origami” under CC BY 4.0; sound effects are Kenney Interface Sounds under CC0. The Guide shows linked attribution and provides `CREDITS.txt` with sources, license links and edits. Repository MIT licensing does not override these licenses.

## Verification scope

Existing browser checks cover deferred media requests, actual duration/playback/seeking, desktop and phone widths, current on-screen instructions, unavailable-media fallback and written chapter navigation. The media downloader's existing test verifies integrity rejection and offline cache reuse. The accepted local master has already passed full decoding and exported-frame review; website publication checks additionally compare its bytes and SHA-256.

GitHub CI, review, deployment and live-site evidence are recorded with the PR and in the local `validation/guide-video-v2-publication/` receipts. A baseline sandbox run could not fetch its loopback fixture; the unchanged Guide tests passed with normal host access. This media change does not change solver behavior or teaching acceptance status.
