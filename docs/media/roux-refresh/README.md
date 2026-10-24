# Roux website film refresh

Status: Short cut accepted on 2026-10-24 with the requested closing-card privacy edit. No new film has been uploaded, emailed or embedded. The existing accepted Guide video remains active.

- Verified website revision: `bfd04215416f9498380c6dca316edd88468e4831`.
- Website PR: [#18](https://github.com/Leosteeeve/cube-steps/pull/18).
- Website, main CI and Pages checks passed; live desktop/mobile and retained-film verification passed. Primary local `main` was synchronized and the merged website worktree was removed after preserving its evidence.
- New editable short-film workspace: `sharing/club-website-introduction/roux-refresh-short-v1/`, relative to the project workspace parent, outside this Git repository.
- Delivered review file: `Webb-Cubing-Club-Intro.mp4`, 30.016 seconds, 1920×1080, 30 fps, H.264/AAC, 4,191,244 bytes (4.00 MiB). The master is already below the 10 MiB email target, so no extra transcode is needed. SHA-256: `b1ff0677c164c21f2d10df0183140eea910a966563e48b32c1b9074e4fac6a73`.
- Source contract 8/8, five real capture clips, full encoded decode, all 900 frames checked for black frames, and PCM clipping checks passed. Nineteen actual encoded frames were visually inspected. Local Chromium playback and seeking passed at desktop, portrait-phone and landscape-phone sizes. Emulation and PCM measurements do not establish physical-device or subjective listening acceptance.
- No narration. Cleared music: Scott Buckley, *Origami*, CC BY 4.0. Cleared effects: Kenney Interface Sounds, CC0. Full attribution and modifications are retained in workspace `CREDITS.txt` and the on-screen ending.

See [storyboard](storyboard.md) and [real-capture manifest](capture-manifest.json). No capture is a prototype search result. Preview/Experimental status and pending physical ergonomic acceptance are retained.

Owner decision (2026-10-24): “通过，最后一个画面可以减少一点我的信息”. Removed the GitHub username/site address from the closing and replaced it with “Full guide: open Guide”; retained the club mark, accepted ending and required audio credits. The requested edit was rendered, decoded and visually inspected. Task24 may proceed; full-film owner acceptance is still required before Guide replacement.

## Full walkthrough review cut

Accepted full film: 300.011 seconds, 1920×1080, 30 fps, 27,968,918 bytes (26.67 MiB). SHA-256: `24be7ff7f23507cd514c21a2591894afe1dd20d2300c70ca1f75b3550eeceaf1`.

Status: accepted by the owner on 2026-10-24; the manifest identifies the accepted replacement. The current Guide video is unchanged. No new upload or embed. Source workspace: `sharing/club-website-introduction/roux-refresh-full-v1/`, outside Git. See [film manifest](film-manifest.json), [capture manifest](full-capture-manifest.json), [chapters](full-chapters.txt) and [timed prompts](full-on-screen-guide.txt).

Full decode, 9,000-frame scan, PCM checks, 10 source-contract fixtures and desktop/phone Chromium playback passed. Encoded actions, boundaries and closing were visually inspected; subjective music and physical-device acceptance remain separate. The closing omits the owner GitHub username/address per the accepted short-film revision.

Guide integration uses the accepted v3 bytes without re-encoding, a new poster, synchronized on-screen prompts/captions and the actual 28 MB download label. Local typecheck/build, 1,072 unit tests, four production video tests and two retained-route/tour tests passed. GitHub Release publication, PR checks and live verification are the remaining release steps; the currently deployed Guide is still v2.
