# Roux execution model v1

Status: experimental, awaiting physical calibration. This is an authored, right-leading, two-handed comparison model, not measured execution time or a claim about every solver's fastest finger tricks. It does not change the CFOP model.

## Score and evidence

`cost = T + 2R + 2G + 2V + 2A`. Each executed outer, wide or slice move in the two blocks contributes one STM unit to T, including half turns. Actual whole-cube rotations contribute to R. Initial positioning is recorded with `position/` event IDs and excluded from these block metrics. Corners and edges are outside the block score.

- G counts explicit single-hand reposition events. The other hand supports the cube. A whole-cube rotation includes its handling and does not also create a regrip charge.
- V counts a recognition checkpoint needing an additional view: the selected physical targets cannot each show at least two stickers in a common U/F/R or U/F/L view. This is a deliberately conservative visibility proxy, not eye tracking. Unknown target IDs make the route unrated.
- A marks the admitted model's rear-face finger reach, sideways E/S slice action or double D action. These are separate finger actions, not another charge for the same grip or visibility event. Routine M/M′/M2 and wide R actions have no inherent awkwardness penalty.

Nine symbolic wrist poses describe left/right quarter-turn offsets in {-1, 0, 1}. Dynamic programming retains the cheapest feasible path to each pose through the entire FB→SB sequence. It never resets the hands at a teaching segment boundary. Matching token profiles and explicit zero-turn regrip profiles are required. Missing transitions, impossible wrist changes, malformed event boundaries and discontinuous physical replay produce **unrated**, not invented handling counts.

v1 composes primitive profiles for both searched and named maneuvers. An algorithm name does not grant an unverified finger-trick discount. Each profile carries an instruction, rationale and references. The source references motivate the move vocabulary; the discrete poses and weights are CubeSteps' own hypotheses.

## Actual rotation alternatives

The bounded variant pass considers one y/y2/y′ conjugation around a block segment. It derives the conjugated tokens with the cube engine, inserts both actual rotations, independently checks the exact final cubie state **and hold**, and recalculates all metrics. The alternative is retained only if its model cost improves. Its turns remain visible in playback; moving the camera is never counted as this transformation. These alternatives are optional candidates, not proof of global ergonomic optimality.

The shared search budget covers catalog validation, graph transitions, simulation and scoring. A stopped budget propagates to the caller, which must keep its previously verified complete route. A shortest first-block witness may remain visible even if it has no admitted execution score; it cannot be advertised as a comfort recommendation.

## Sources and limits

- [Roux Tutorial: Second Block](https://tutorial.rouxers.com/intermediate/second-block.html), checked 2026-10-23: R/r/U/M techniques, wide insertions, and alternatives to treating SB as CFOP. This supports considering M and wide turns as ordinary Roux tools.
- [The Roux Reader: First Block](https://book.rouxers.com/fb.html), checked 2026-10-23: different constructions and influencing later pieces motivate comparing continuations instead of choosing on FB length alone.

The exact wrist model, visibility proxy and weights are not findings from these sources. Josh and club members should compare routes on physical cubes and record time and feel before any calibration changes. Left-handed and personal adaptations are deferred; this version does not infer them from a user's results.
