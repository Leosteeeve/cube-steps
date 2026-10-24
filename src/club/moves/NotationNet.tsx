import type { Color, Face, FaceletSnapshot } from '../../core/types';
import { CUBE_COLORS as colors } from '../../ui/cube-colors';
const positions: Record<Face, [number, number]> = {
  U: [1, 0],
  L: [0, 1],
  F: [1, 1],
  R: [2, 1],
  B: [3, 1],
  D: [1, 2],
};
export function NotationNet({ facelets, label }: { facelets: FaceletSnapshot; label: string }) {
  return (
    <svg className="notation-net" viewBox="0 0 272 216" role="img" aria-label={label}>
      <desc>
        Outside views, read left to right and top to bottom. Up is above Front; Left, Front, Right
        and Back are in a row; Down is below Front.
      </desc>
      {(Object.keys(positions) as Face[]).map((face) => (
        <g
          key={face}
          transform={`translate(${positions[face][0] * 68 + 4} ${positions[face][1] * 72 + 3})`}
          data-face={face}
        >
          <title>
            {face}: {facelets[face].join(', ')}
          </title>
          {facelets[face].map((color, index) => (
            <rect
              key={index}
              data-color={color}
              x={(index % 3) * 20}
              y={Math.floor(index / 3) * 20}
              width="19"
              height="19"
              rx="2"
              fill={colors[color]}
              stroke="#183651"
              strokeWidth="1"
            />
          ))}
          <text x="29" y="69" textAnchor="middle" fontSize="10" fill="#183651">
            {face}
          </text>
        </g>
      ))}
    </svg>
  );
}
