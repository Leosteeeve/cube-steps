import type { Face, FaceletSnapshot, Color } from '../../core/types';
import { FACE_NAMES } from '../../core/facelet-layout';
import { CUBE_COLORS as colors } from '../../ui/cube-colors';
const positions: Record<Face, [number, number]> = {
  U: [1, 0],
  L: [0, 1],
  F: [1, 1],
  R: [2, 1],
  B: [3, 1],
  D: [1, 2],
};
export function ScrambleNet({ facelets, label }: { facelets: FaceletSnapshot; label: string }) {
  return (
    <figure className="timer-net">
      <svg viewBox="0 0 260 200" role="img" aria-label={label}>
        <desc>
          Outside views. Up above Front; Left, Front, Right, Back in a row; Down below Front. Each
          face is read left to right, top to bottom.
        </desc>
        {(Object.keys(positions) as Face[]).map((face) => {
          const [x, y] = positions[face];
          return (
            <g key={face} data-face={face} transform={`translate(${x * 65 + 2} ${y * 66 + 2})`}>
              <title>
                {FACE_NAMES[face]}: {facelets[face].join(', ')}
              </title>
              {facelets[face].map((color, i) => (
                <rect
                  key={i}
                  data-color={color}
                  x={(i % 3) * 19}
                  y={Math.floor(i / 3) * 19}
                  width="18"
                  height="18"
                  rx="2"
                  fill={colors[color]}
                  stroke="#08264a"
                  strokeWidth="1"
                />
              ))}
              <rect x="20" y="20" width="16" height="16" rx="3" fill="#fff" fillOpacity=".88" />
              <text x="28" y="32" textAnchor="middle" fontSize="11" fill="#08264a" fontWeight="700">
                {face}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption>White on top · Green in front</figcaption>
    </figure>
  );
}
