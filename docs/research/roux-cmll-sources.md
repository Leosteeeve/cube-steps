# CMLL sources and admission

Research date: 2026-10-23. Status: Preview; physical comfort acceptance remains pending.

## Original sources

- [Kian's CMLLs, original document](https://docs.google.com/document/d/1S_y2evAxJ2vMMFDtfGSOsgHuDMYR-sEjoEU_mtSD7Qc/edit). The public HTML was read with its CSS font weights intact, paragraph by paragraph. Bold algorithm selections, including split bold spans and multiple bold choices, were distinguished from the other alternatives. The first bold selection initializes each default. Four additional source alternatives are retained: O adjacent wide-turn, H columns second bold selection, Sune left-bar wide-turn, and L diagonal second bold selection.
- [Kian's CMLL page and companion execution video](https://sites.google.com/view/kianroux/cmll). This identifies the original author and provides an execution reference for members. We do not claim to have measured the video's finger-trick times.
- [The Roux Reader: CMLL recognition](https://book.rouxers.com/cmll.html). Recognition must consider the corner side colors as well as their orientation. The generated CubeSteps recognition text reports the actual physical stickers and ignores remaining-edge patterns.

The source algorithms are move sequences, not a license to copy source illustrations, prose or recordings. CubeSteps' recognition text, teaching explanations, diagrams and display segmentation are original. No external document images or video footage are vendored. Original notation and source links are preserved on each variant; third-party material is not represented as CubeSteps MIT content.

## Notation and holds

Lowercase wide turns become explicit `Rw` notation. Curly primes become ASCII primes. `U2′` and `R2′` normalize to the physically identical half turn. Parenthesized source AUFs describe the source diagram's setup; our recognizer derives the setup from the member's actual cube instead of applying that parenthesis unconditionally. There are no hidden whole-cube rotations.

The saved example recognition is in the canonical white-down, blue-left hold. Runtime action explanations and target identities are regenerated for the selected frame, including white-up cases. Reading chunks are explicit authored ranges. Only the complete formula endpoint guarantees restored blocks.

## Verification

`node scripts/roux-advanced/verify-cmll.mts` rebuilds the catalog in memory and compares it byte for byte with the checked-in asset. `--write` regenerates it after an intentional source change. The current catalog has 42 cases, 46 variants and digest `97b13cdd`; its generated JSON is 131,731 bytes with SHA-256 `a9c95b1ca73a87b2169c78551d8ce6561801787696becab33872ffdbbdaeb4ce`.

Admission verifies family counts, unique case coverage, source metadata, segment bounds, feasible primitive execution profiles, protected blocks, all four center phases, and all 12 edge permutation/orientation effects. An alternative must belong to the same recognized corner class. Only deeply frozen admitted catalogs can reuse validation caches; mutable nested effects are rechecked. Raw coordinate legality is checked before color mapping can normalize a malformed value.

Independent enumeration covers all 24 corner permutations × 27 legal corner twists, with unrelated legal edge flips/permutations. This yields 644 non-solved recognition states and four solved U offsets: 42 classes plus skip. Separate tests exercise every primary case in eight holding frames and four middle-center phases, replaying all returned alternatives and their protected-piece checkpoints. Same-top/different-side cases are checked explicitly.

The finite handling model establishes that a supported execution path exists. It does not establish a universal fastest CMLL or replace physical trials. Primary selection starts with the author's bold choices; later route selection may compare a verified alternative's actual remaining-edge continuation without changing the FB+SB score.
