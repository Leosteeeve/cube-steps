// Transcribed algorithm notation; original teaching text and display chunks.
// Source formatting inspected 2026-10-23. See docs/research/roux-cmll-sources.md.
export const CMLL_SOURCE_DATA = [
  {
    id: 'cmll-o-1',
    family: 'O',
    label: 'Adjacent Swap',
    variants: [
      {
        sourceNotation: "R U R' F' R U R' U' R' F R2 U' R'",
        chunks: ["R U R'", "F' R U R' U'", "R' F R2 U' R'"],
        preference:
          'Source bold selection for the initial right-leading default; physical calibration pending.',
      },
      {
        sourceNotation: "r U R' F' R U R' U' R' F R2 U' r'",
        chunks: ["Rw U R' F'", "R U R' U'", "R' F R2 U' Rw'"],
        preference: 'Verified source alternative; compare handling and remaining edges.',
      },
    ],
  },
  {
    id: 'cmll-o-2',
    family: 'O',
    label: 'Diagonal Swap',
    variants: [
      {
        sourceNotation: "F R U' R' U' R U R' F' R U R' U' R' F R F'",
        chunks: ["F R U' R' U' R U R' F'", "R U R' U' R' F R F'"],
        preference:
          'Source bold selection for the initial right-leading default; physical calibration pending.',
      },
    ],
  },
  {
    id: 'cmll-h-1',
    family: 'H',
    label: 'Columns',
    variants: [
      {
        sourceNotation: 'R U2 R’ U’ R U R’ U’ R U’ R’',
        chunks: ["R U2 R'", "U' R U R'", "U' R U' R'"],
        preference:
          'Source bold selection for the initial right-leading default; physical calibration pending.',
      },
      {
        sourceNotation: "(U) R U R' U R U' R' U R U2' R'",
        chunks: ["R U R' U", "R U' R' U", "R U2 R'"],
        preference: 'Verified source alternative; compare handling and remaining edges.',
      },
    ],
  },
  {
    id: 'cmll-h-2',
    family: 'H',
    label: 'Rows',
    variants: [
      {
        sourceNotation: "F R U R' U' R U R' U' R U R' U' F'",
        chunks: ['F', "R U R' U'", "R U R' U'", "R U R' U' F'"],
        preference:
          'Source bold selection for the initial right-leading default; physical calibration pending.',
      },
    ],
  },
  {
    id: 'cmll-h-3',
    family: 'H',
    label: 'Column',
    variants: [
      {
        sourceNotation: "(U) R U2' R2' F R F' U2 R' F R F'",
        chunks: ['R U2 R2', "F R F'", "U2 R'", "F R F'"],
        preference:
          'Source bold selection for the initial right-leading default; physical calibration pending.',
      },
    ],
  },
  {
    id: 'cmll-h-4',
    family: 'H',
    label: 'Row',
    variants: [
      {
        sourceNotation: "(U2) r U' r2' D' r U' r' D r2 U r'",
        chunks: ["Rw U' Rw2", "D' Rw U' Rw'", 'D Rw2', "U Rw'"],
        preference:
          'Source bold selection for the initial right-leading default; physical calibration pending.',
      },
    ],
  },
  {
    id: 'cmll-pi-1',
    family: 'Pi',
    label: 'Right Bar',
    variants: [
      {
        sourceNotation: "F R U R' U' R U R' U' F'",
        chunks: ['F', "R U R' U'", "R U R' U'", "F'"],
        preference:
          'Source bold selection for the initial right-leading default; physical calibration pending.',
      },
    ],
  },
  {
    id: 'cmll-pi-2',
    family: 'Pi',
    label: 'Back Slash',
    variants: [
      {
        sourceNotation: "(U) F R' F' R U2 R U' R' U R U2' R'",
        chunks: ["F R' F' R", "U2 R U' R'", "U R U2 R'"],
        preference:
          'Source bold selection for the initial right-leading default; physical calibration pending.',
      },
    ],
  },
  {
    id: 'cmll-pi-3',
    family: 'Pi',
    label: 'X Checkerboard',
    variants: [
      {
        sourceNotation: "(U') R' F R U F U' R U R' U' F'",
        chunks: ["R' F R", "U F U'", "R U R' U' F'"],
        preference:
          'Source bold selection for the initial right-leading default; physical calibration pending.',
      },
    ],
  },
  {
    id: 'cmll-pi-4',
    family: 'Pi',
    label: 'Forward Slash',
    variants: [
      {
        sourceNotation: "R U2 R' U' R U R' U2' R' F R F'",
        chunks: ["R U2 R' U'", "R U R' U2", "R' F R F'"],
        preference:
          'Source bold selection for the initial right-leading default; physical calibration pending.',
      },
    ],
  },
  {
    id: 'cmll-pi-5',
    family: 'Pi',
    label: 'Columns',
    variants: [
      {
        sourceNotation: "(U’) r U' r2' D' r U r' D r2 U r'",
        chunks: ["Rw U' Rw2", "D' Rw U Rw'", 'D Rw2', "U Rw'"],
        preference:
          'Source bold selection for the initial right-leading default; physical calibration pending.',
      },
    ],
  },
  {
    id: 'cmll-pi-6',
    family: 'Pi',
    label: 'Left Bar',
    variants: [
      {
        sourceNotation: "(U') R' U' R' F R F' R U' R' U2 R",
        chunks: ["R' U' R'", "F R F'", "R U'", "R' U2 R"],
        preference:
          'Source bold selection for the initial right-leading default; physical calibration pending.',
      },
    ],
  },
  {
    id: 'cmll-u-1',
    family: 'U',
    label: 'Forward Slash',
    variants: [
      {
        sourceNotation: "(U2) R2 D R' U2 R D' R' U2 R'",
        chunks: ['R2 D', "R' U2 R", "D'", "R' U2 R'"],
        preference:
          'Source bold selection for the initial right-leading default; physical calibration pending.',
      },
    ],
  },
  {
    id: 'cmll-u-2',
    family: 'U',
    label: 'Back Slash',
    variants: [
      {
        sourceNotation: "R2' D' R U2 R' D R U2 R",
        chunks: ["R2 D'", "R U2 R'", 'D', 'R U2 R'],
        preference:
          'Source bold selection for the initial right-leading default; physical calibration pending.',
      },
    ],
  },
  {
    id: 'cmll-u-3',
    family: 'U',
    label: 'Front Row',
    variants: [
      {
        sourceNotation: "R2' F U' F U F2 R2 U' R' F R",
        chunks: ['R2 F', "U' F U F2", "R2 U'", "R' F R"],
        preference:
          'Source bold selection for the initial right-leading default; physical calibration pending.',
      },
    ],
  },
  {
    id: 'cmll-u-4',
    family: 'U',
    label: 'Rows',
    variants: [
      {
        sourceNotation: "(U') F R2 D R' U R D' R2' U' F'",
        chunks: ['F R2 D', "R' U R", "D' R2", "U' F'"],
        preference:
          'Source bold selection for the initial right-leading default; physical calibration pending.',
      },
    ],
  },
  {
    id: 'cmll-u-5',
    family: 'U',
    label: 'X Checkerboard',
    variants: [
      {
        sourceNotation: "(U2) r U' r' U r' D' r U' r' D r",
        chunks: ["Rw U' Rw'", "U Rw' D'", "Rw U' Rw'", 'D Rw'],
        preference:
          'Source bold selection for the initial right-leading default; physical calibration pending.',
      },
    ],
  },
  {
    id: 'cmll-u-6',
    family: 'U',
    label: 'Back Row',
    variants: [
      {
        sourceNotation: "(U') F R U R' U' F'",
        chunks: ['F', "R U R' U'", "F'"],
        preference:
          'Source bold selection for the initial right-leading default; physical calibration pending.',
      },
    ],
  },
  {
    id: 'cmll-t-1',
    family: 'T',
    label: 'Left Bar',
    variants: [
      {
        sourceNotation: "(U') R U R' U' R' F R F'",
        chunks: ["R U R' U'", "R' F R F'"],
        preference:
          'Source bold selection for the initial right-leading default; physical calibration pending.',
      },
    ],
  },
  {
    id: 'cmll-t-2',
    family: 'T',
    label: 'Right Bar',
    variants: [
      {
        sourceNotation: "(U) L' U' L U L F' L' F",
        chunks: ["L' U' L U", "L F' L' F"],
        preference:
          'Source bold selection for the initial right-leading default; physical calibration pending.',
      },
    ],
  },
  {
    id: 'cmll-t-3',
    family: 'T',
    label: 'Rows',
    variants: [
      {
        sourceNotation: "F R' F R2 U' R' U' R U R' F2",
        chunks: ["F R' F R2", "U' R' U'", "R U R' F2"],
        preference:
          'Source bold selection for the initial right-leading default; physical calibration pending.',
      },
    ],
  },
  {
    id: 'cmll-t-4',
    family: 'T',
    label: 'Front Row',
    variants: [
      {
        sourceNotation: "r' U r U2’ R2’ F R F' R",
        chunks: ["Rw' U Rw", 'U2 R2', "F R F' R"],
        preference:
          'Source bold selection for the initial right-leading default; physical calibration pending.',
      },
    ],
  },
  {
    id: 'cmll-t-5',
    family: 'T',
    label: 'Back Row',
    variants: [
      {
        sourceNotation: "r' D' r U r' D r U' r U r'",
        chunks: ["Rw' D' Rw", "U Rw' D Rw", "U' Rw U Rw'"],
        preference:
          'Source bold selection for the initial right-leading default; physical calibration pending.',
      },
    ],
  },
  {
    id: 'cmll-t-6',
    family: 'T',
    label: 'Columns',
    variants: [
      {
        sourceNotation: "(U2) r2’ D' r U r' D r2 U' r' U' r",
        chunks: ["Rw2 D'", "Rw U Rw' D", "Rw2 U'", "Rw' U' Rw"],
        preference:
          'Source bold selection for the initial right-leading default; physical calibration pending.',
      },
    ],
  },
  {
    id: 'cmll-sune-1',
    family: 'Sune',
    label: 'Left Bar',
    variants: [
      {
        sourceNotation: "(U) R U R' U R U2 R'",
        chunks: ["R U R'", 'U', "R U2 R'"],
        preference:
          'Source bold selection for the initial right-leading default; physical calibration pending.',
      },
      {
        sourceNotation: "(U) r U R' U R U2 r'",
        chunks: ["Rw U R' U", "R U2 Rw'"],
        preference: 'Verified source alternative; compare handling and remaining edges.',
      },
    ],
  },
  {
    id: 'cmll-sune-2',
    family: 'Sune',
    label: 'X Checkerboard',
    variants: [
      {
        sourceNotation: "(U) L' U2 L U2’ L F' L' F",
        chunks: ["L' U2 L U2", "L F' L' F"],
        preference:
          'Source bold selection for the initial right-leading default; physical calibration pending.',
      },
    ],
  },
  {
    id: 'cmll-sune-3',
    family: 'Sune',
    label: 'Forward Slash',
    variants: [
      {
        sourceNotation: "(U) F R' F' R U2 R U2’ R'",
        chunks: ["F R' F' R", "U2 R U2 R'"],
        preference:
          'Source bold selection for the initial right-leading default; physical calibration pending.',
      },
    ],
  },
  {
    id: 'cmll-sune-4',
    family: 'Sune',
    label: 'Columns',
    variants: [
      {
        sourceNotation: "(U) R U R' U' R' F R F' R U R' U R U2’ R'",
        chunks: ["R U R' U'", "R' F R F'", "R U R'", "U R U2 R'"],
        preference:
          'Source bold selection for the initial right-leading default; physical calibration pending.',
      },
    ],
  },
  {
    id: 'cmll-sune-5',
    family: 'Sune',
    label: 'Right Bar',
    variants: [
      {
        sourceNotation: "(U') R U R' U R' F R F' R U2’ R'",
        chunks: ["R U R' U", "R' F R F'", "R U2 R'"],
        preference:
          'Source bold selection for the initial right-leading default; physical calibration pending.',
      },
    ],
  },
  {
    id: 'cmll-sune-6',
    family: 'Sune',
    label: 'Back Slash',
    variants: [
      {
        sourceNotation: "(U) R U' L' U R' U' L",
        chunks: ["R U' L'", 'U', "R' U' L"],
        preference:
          'Source bold selection for the initial right-leading default; physical calibration pending.',
      },
    ],
  },
  {
    id: 'cmll-anti-sune-1',
    family: 'Anti-Sune',
    label: 'Right Bar',
    variants: [
      {
        sourceNotation: "(U) R' U' R U' R' U2’ R",
        chunks: ["R' U' R", "U'", "R' U2 R"],
        preference:
          'Source bold selection for the initial right-leading default; physical calibration pending.',
      },
    ],
  },
  {
    id: 'cmll-anti-sune-2',
    family: 'Anti-Sune',
    label: 'Columns',
    variants: [
      {
        sourceNotation: "(U') R2 D R' U R D' R' U R' U' R U' R'",
        chunks: ['R2 D', "R' U R D'", "R' U R'", "U' R U' R'"],
        preference:
          'Source bold selection for the initial right-leading default; physical calibration pending.',
      },
    ],
  },
  {
    id: 'cmll-anti-sune-3',
    family: 'Anti-Sune',
    label: 'Back Slash',
    variants: [
      {
        sourceNotation: "(U') F' L F L' U2’ L' U2 L",
        chunks: ["F' L F L'", "U2 L' U2 L"],
        preference:
          'Source bold selection for the initial right-leading default; physical calibration pending.',
      },
    ],
  },
  {
    id: 'cmll-anti-sune-4',
    family: 'Anti-Sune',
    label: 'X Checkerboard',
    variants: [
      {
        sourceNotation: "(U') R U2’ R' U2 R' F R F'",
        chunks: ["R U2 R' U2", "R' F R F'"],
        preference:
          'Source bold selection for the initial right-leading default; physical calibration pending.',
      },
    ],
  },
  {
    id: 'cmll-anti-sune-5',
    family: 'Anti-Sune',
    label: 'Forward Slash',
    variants: [
      {
        sourceNotation: "(U') L' U R U' L U R'",
        chunks: ["L' U R", "U'", "L U R'"],
        preference:
          'Source bold selection for the initial right-leading default; physical calibration pending.',
      },
    ],
  },
  {
    id: 'cmll-anti-sune-6',
    family: 'Anti-Sune',
    label: 'Left Bar',
    variants: [
      {
        sourceNotation: "R' U' R U' R' U R' F R F' U R",
        chunks: ["R' U' R U'", "R' U R'", "F R F'", 'U R'],
        preference:
          'Source bold selection for the initial right-leading default; physical calibration pending.',
      },
    ],
  },
  {
    id: 'cmll-l-1',
    family: 'L',
    label: 'Mirror',
    variants: [
      {
        sourceNotation: "(U2) F R U' R' U' R U R' F'",
        chunks: ['F', "R U' R' U'", "R U R'", "F'"],
        preference:
          'Source bold selection for the initial right-leading default; physical calibration pending.',
      },
    ],
  },
  {
    id: 'cmll-l-2',
    family: 'L',
    label: 'Inverse',
    variants: [
      {
        sourceNotation: "(U2) F R' F' R U R U' R'",
        chunks: ["F R' F' R", "U R U' R'"],
        preference:
          'Source bold selection for the initial right-leading default; physical calibration pending.',
      },
    ],
  },
  {
    id: 'cmll-l-3',
    family: 'L',
    label: 'Pure',
    variants: [
      {
        sourceNotation: 'R U2 R’ U’ R U R’ U’ R U R’ U’ R U’ R’',
        chunks: ["R U2 R' U'", "R U R' U'", "R U R' U'", "R U' R'"],
        preference:
          'Source bold selection for the initial right-leading default; physical calibration pending.',
      },
    ],
  },
  {
    id: 'cmll-l-4',
    family: 'L',
    label: 'Front Commutator',
    variants: [
      {
        sourceNotation: "(U2) R U2 R D R' U2 R D' R2’",
        chunks: ['R U2 R', 'D', "R' U2 R", "D' R2"],
        preference:
          'Source bold selection for the initial right-leading default; physical calibration pending.',
      },
    ],
  },
  {
    id: 'cmll-l-5',
    family: 'L',
    label: 'Diag',
    variants: [
      {
        sourceNotation: "R' U' R U R’ F' R U R' U' R' F R2",
        chunks: ["R' U' R U", "R' F'", "R U R' U'", "R' F R2"],
        preference:
          'Source bold selection for the initial right-leading default; physical calibration pending.',
      },
      {
        sourceNotation: "(U2) R U2’ R2’ F R F' R U2’ R'",
        chunks: ['R U2 R2 F', "R F' R U2", "R'"],
        preference: 'Verified source alternative; compare handling and remaining edges.',
      },
    ],
  },
  {
    id: 'cmll-l-6',
    family: 'L',
    label: 'Back Commutator',
    variants: [
      {
        sourceNotation: "(U) R' U2 R' D' R U2 R' D R2",
        chunks: ["R' U2 R'", "D'", "R U2 R'", 'D R2'],
        preference:
          'Source bold selection for the initial right-leading default; physical calibration pending.',
      },
    ],
  },
] as const;
