# CFOP Lab execution model v1

Status: engineering hypothesis; physical review pending. This model supports right-hand-leading, two-handed practiced solving. Its cost units are not seconds, measured finger motions, or evidence of globally optimal F2L.

The model uses nine symbolic poses, `l{-1,0,1}r{-1,0,1}`. Zero is a neutral wrist hold; signed states track one quarter-turn of the named wrist relative to that hold. These are bookkeeping states, not anatomical angle measurements. Thumbs travel with a wrist turn. Both hands support the cube, and a free hand/fingers retain support during a reposition. Repositioning one hand costs one G event, both hands two. No reposition moves the cube state. The initial neutral hold is adopted before timing.

Right and left face/wide turns advance the matching wrist state. Half turns connect the two opposite turned states, requiring preparation when starting neutral. Upper turns prefer right index/middle flicks; U-prime uses the left index. A left reverse flick is a marked fallback from an awkward right-wrist pose. Down turns use a free left ring finger. Front turns use an index/thumb push or pull; rear and slice finger actions have explicit handling notes and an initial awkwardness estimate. These templates deliberately approximate a limited handling vocabulary. They do not certify one exact finger sequence as best for every hand.

Actual x/y/z rotations return the symbolic hands to neutral. Their required handling is charged once under R, with no additional G for that same operation. The physical cube engine still performs the rotation. Camera motion never enters this graph.

Formula profiles bind the exact tokens and recognition mode of admitted F2L variants/preparations. They compose the token-level transition graph across formula boundaries; they do not reset hands to neutral between formulas. The old scalar grip penalty is not used as an invented detailed finger profile. Dynamic programming retains the lowest-cost path for each terminal pose, so an alternative ending grip can help the next pair. Missing formula/token coverage yields an unrated reference rather than fabricated comfort evidence.

The front-view envelope is U/F/R or U/F/L at a recognition checkpoint. For sticker-direction cases, check the bottom-color corner sticker (or an aligned visible side sticker if it faces down) and the relevant edge sticker. Connected-pair cases additionally require both shared identifying faces in one front view. An extra view costs V=1; it is not a camera operation added to the move sequence.

Cost = T + 2R + 2G + 3V + 2A. Outer/wide turns cost T=1 and slices T=2, including half turns. Physical rotation tokens cost R=1, including half rotations. A marks a catalog-declared awkward finger/grip/view event; a grip/view cause already charged as G/V is not charged again. Positioning and OLL/PLL/AUF are excluded from the optimized subtotal. All components and their boundary instructions remain inspectable.

On-paper review fixtures: R U R-prime carries the right wrist through an upper flick and back; R2 retains alternative ending wrist states; three consecutive R turns require a reposition; a revealing y2 costs R once and may avoid V; a y2 before an already-visible case adds cost. Real handling review by the club testers remains required before any physical-review label.

Formula provenance stays with the shared catalog. These symbolic profiles and explanations are original project content. A new formula/profile must pass exact-token admission, physical case replay and transition/recognition tests. Changing weights or grip semantics creates a new model version; historical experiments retain their original model and definitions.
