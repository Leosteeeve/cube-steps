import type { CaseExample } from './course-types';
// Literal six-face examples admitted by replaying the real CFOP teaching rules.
export const CFOP_GUIDED_SCRAMBLE = "U F' L' R' F L2 B F' B' D U F' R L2 R' B2 L2 D' B2 D' F' B2 U2 B' L2";
export const CFOP_EXAMPLES: readonly CaseExample[] = [
  {
    "id": "cross-insert",
    "title": "Match and insert a cross edge",
    "scramble": "D' B2 L' U2 L B' F2 D' U R2 B' U' R' U2 L2 F L F' B2 R D' F R U' L'",
    "expectedCaseId": "cross-insert",
    "stageId": "cfop-cross"
  },
  {
    "id": "f2l-connected",
    "title": "Connected pair",
    "scramble": "D' B2 L' U2 L B' F2 D' U R2 B' U' R' U2 L2 F L F' B2 R D' F R U' L'",
    "expectedCaseId": "f2l-connected",
    "stageId": "cfop-f2l"
  },
  {
    "id": "f2l-matching",
    "title": "Matching upper colors",
    "scramble": "D' B2 L' U2 L B' F2 D' U R2 B' U' R' U2 L2 F L F' B2 R D' F R U' L'",
    "expectedCaseId": "f2l-matching",
    "stageId": "cfop-f2l"
  },
  {
    "id": "f2l-opposite",
    "title": "Different upper colors",
    "scramble": "D' B2 L' U2 L B' F2 D' U R2 B' U' R' U2 L2 F L F' B2 R D' F R U' L'",
    "expectedCaseId": "f2l-opposite",
    "stageId": "cfop-f2l"
  },
  {
    "id": "f2l-white-up",
    "title": "White facing up",
    "scramble": "D' B2 L' U2 L B' F2 D' U R2 B' U' R' U2 L2 F L F' B2 R D' F R U' L'",
    "expectedCaseId": "f2l-white-up",
    "stageId": "cfop-f2l"
  },
  {
    "id": "f2l-trapped",
    "title": "Pieces trapped in a slot",
    "scramble": "D' B2 L' U2 L B' F2 D' U R2 B' U' R' U2 L2 F L F' B2 R D' F R U' L'",
    "expectedCaseId": "f2l-trapped",
    "stageId": "cfop-f2l"
  },
  {
    "id": "oll-edge-line",
    "title": "Yellow line",
    "scramble": "U B' U F' U2 L U R B D' B U L' B2 D' F' D' F' U' R B' L2 B2 U' R2",
    "expectedCaseId": "oll-edge-line",
    "stageId": "cfop-oll-edges"
  },
  {
    "id": "oll-edge-l",
    "title": "Yellow L",
    "scramble": "D' B2 L' U2 L B' F2 D' U R2 B' U' R' U2 L2 F L F' B2 R D' F R U' L'",
    "expectedCaseId": "oll-edge-l",
    "stageId": "cfop-oll-edges"
  },
  {
    "id": "oll-edge-dot",
    "title": "Yellow dot",
    "scramble": "U F' L' R' F L2 B F' B' D U F' R L2 R' B2 L2 D' B2 D' F' B2 U2 B' L2",
    "expectedCaseId": "oll-edge-dot",
    "stageId": "cfop-oll-edges"
  },
  {
    "id": "oll-corner-21",
    "title": "OLL 21",
    "scramble": "U F' L' R' F L2 B F' B' D U F' R L2 R' B2 L2 D' B2 D' F' B2 U2 B' L2",
    "expectedCaseId": "oll-corner-21",
    "stageId": "cfop-oll-corners"
  },
  {
    "id": "oll-corner-22",
    "title": "OLL 22",
    "scramble": "D' U' D' U' D F L2 F2 U' L' D2 F' U2 R U F R F2 B L2 F L2 F2 B2 R2",
    "expectedCaseId": "oll-corner-22",
    "stageId": "cfop-oll-corners"
  },
  {
    "id": "oll-corner-23",
    "title": "OLL 23",
    "scramble": "D2 L' B' L2 D2 B U' L' D' R2 B D U L U2 F2 L D B2 U2 B' U R U' L2",
    "expectedCaseId": "oll-corner-23",
    "stageId": "cfop-oll-corners"
  },
  {
    "id": "oll-corner-24",
    "title": "OLL 24",
    "scramble": "U R' U2 D F' L B D' B' F2 R' U D U2 L U2 F2 R L' B L' B2 L D2 U2",
    "expectedCaseId": "oll-corner-24",
    "stageId": "cfop-oll-corners"
  },
  {
    "id": "oll-corner-25",
    "title": "OLL 25",
    "scramble": "U' R' U2 B' F L D2 B U2 D' F2 D2 B' R2 B2 D R' D L R' B' D2 U2 L2 B2",
    "expectedCaseId": "oll-corner-25",
    "stageId": "cfop-oll-corners"
  },
  {
    "id": "oll-corner-26",
    "title": "OLL 26: anti-Sune",
    "scramble": "D2 R' U' B F' B U R B2 R2 D' R2 F R L2 B D F' B U2 F' R' D2 L' F'",
    "expectedCaseId": "oll-corner-26",
    "stageId": "cfop-oll-corners"
  },
  {
    "id": "oll-corner-27",
    "title": "OLL 27: Sune",
    "scramble": "D' B2 L' U2 L B' F2 D' U R2 B' U' R' U2 L2 F L F' B2 R D' F R U' L'",
    "expectedCaseId": "oll-corner-27",
    "stageId": "cfop-oll-corners"
  },
  {
    "id": "pll-t",
    "title": "T permutation: adjacent corners",
    "scramble": "U F' L' R' F L2 B F' B' D U F' R L2 R' B2 L2 D' B2 D' F' B2 U2 B' L2",
    "expectedCaseId": "pll-t",
    "stageId": "cfop-pll-corners"
  },
  {
    "id": "pll-y",
    "title": "Y permutation: diagonal corners",
    "scramble": "U B U F' B2 L' U B D B' F L B' U' L' U F' B' D' F' L R' B2 F U2",
    "expectedCaseId": "pll-y",
    "stageId": "cfop-pll-corners"
  },
  {
    "id": "pll-ua",
    "title": "Ua permutation",
    "scramble": "U F' L' R' F L2 B F' B' D U F' R L2 R' B2 L2 D' B2 D' F' B2 U2 B' L2",
    "expectedCaseId": "pll-ua",
    "stageId": "cfop-pll-edges"
  },
  {
    "id": "pll-ub",
    "title": "Ub permutation",
    "scramble": "D' B2 L' U2 L B' F2 D' U R2 B' U' R' U2 L2 F L F' B2 R D' F R U' L'",
    "expectedCaseId": "pll-ub",
    "stageId": "cfop-pll-edges"
  },
  {
    "id": "pll-h",
    "title": "H permutation",
    "scramble": "D' B R' B2 R2 D R B2 U D U2 D' R L U B U B2 U L' B2 L2 F' B U",
    "expectedCaseId": "pll-h",
    "stageId": "cfop-pll-edges"
  },
  {
    "id": "pll-z",
    "title": "Z permutation",
    "scramble": "D2 R' U' B F' B U R B2 R2 D' R2 F R L2 B D F' B U2 F' R' D2 L' F'",
    "expectedCaseId": "pll-z",
    "stageId": "cfop-pll-edges"
  },
  {
    "id": "auf",
    "title": "Final upper-face adjustment",
    "scramble": "D' B2 L' U2 L B' F2 D' U R2 B' U' R' U2 L2 F L F' B2 R D' F R U' L'",
    "expectedCaseId": "auf",
    "stageId": "cfop-auf"
  }
];
