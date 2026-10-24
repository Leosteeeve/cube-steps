# Advanced LSE v1

Status: Preview, with physical teaching and ergonomic acceptance pending.

The coordinate includes the six remaining edges, their orientation, the middle-center phase and the upper corner-ring offset. The independent parity-valid domain has 184,320 states and agrees with reachability under U/U′/U2/M/M′/M2. No legal state is excluded to make the tables complete.

## Combined route

Ordinary EOLR ends with six oriented edges and both upper lateral edges beside their matching corners, allowing the recorded U offset and a half-turned middle-center reference. It does not use the deferred EOLRb bottom-placement goal.

The combined table searches backward from every EOLR endpoint with that endpoint's complete last-four cost as its initial weight. It therefore compares prefix plus continuation. Equal total costs prefer a shorter prefix before stable move ordering. The nearest-EOLR table is retained as a comparison, not automatically selected as the best full continuation.

Last four uses primitive M/U turns. Its graph keeps the lateral edges matched to their neighboring corner ring throughout; a quarter-M center reference may be temporarily in progress. Every ordinary EOLR endpoint is included, and the final goal restores all edges, center phase and U offset. This avoids counting two adjacent M′ turns as two moves when one M2 performs the same work.

The current neutral two-handed model leaves the grip unchanged for all these M/U primitives. Those paths form one grip-equivalence class, so this version retains one deterministic minimum-cost representative, not fabricated grip alternatives. Its local score is separate from the FB+SB subtotal. A changed handling model needs renewed continuation comparisons; the present result is not a measured-time optimum.

## Basic route

Basic guidance computes a distinct EO → lateral-pair → last-four route. EO and lateral-pair use verified beginner maneuvers with their actual preconditions; last four uses the primitive graph above. The recorded EO checkpoint exists in this route. It is not an explanation overlaid on a combined route that never visits that state. M/M′ are actual layer operations, and every explanation reports the current bad-edge reference and corner-ring offset in the selected colors.

## Regression and verification

A legal setup relative to the chosen Roux hold is:

`M2 U M′ U′ M′ U′ M U2 M′ U M U M U′`

The nearest EOLR endpoint takes 10 turns followed by 6 last-four turns. The joint route takes 12 turns to EOLR followed by 2 turns: 14 instead of 16. Both routes replay to the exact solved state; the comparison contains no adjacent turns that could be merged. This is a concrete scoped comparison, not a claim that an entire Roux solve is globally optimal.

`node scripts/roux-advanced/build-lse.mts --verify` regenerates the binary and manifest exactly. The tables contain EO, lateral-pair, last-four, nearest-EOLR and combined costs and next steps. The current binary is 3,686,416 bytes with SHA-256 `a1cf4d9f5c49d45f62f73872b8c1258ce2acdfde4757b1372144c326a71da233`. Maximum stored costs are respectively 12, 6, 8, 15 and 20 STM.

The exhaustive test checks every legal coordinate, all six primitive physical effects, each admitted table transition, terminal predicates and strictly decreasing costs. Separate tests check real EO/EOLR boundaries, all eight frames, exact final center phase, skipped last four, asset corruption and the maneuver-boundary regression. Byte admission keeps a private copy so a caller cannot mutate the active tables through the public buffer.

## References

- [EOLR original teaching document](https://docs.google.com/document/d/1dvGERLfN-0rVwN914HH1zRPHLfdM6d5rPfe0HxOMK08/edit), inspected 2026-10-23 for joint edge orientation/placement reasoning. CubeSteps explanations are generated from actual states rather than copied from its prose or diagrams.
- [The Roux Reader: LSE](https://book.rouxers.com/lse.html), checked 2026-10-23. Its EOLRb sections are explicitly distinct from the ordinary upper-lateral endpoint implemented here.
