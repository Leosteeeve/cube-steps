import type { Face, FaceletSnapshot, Color } from '../../core/types';
const positions: Record<Face, [number, number]> = {
  U: [1, 0],
  L: [0, 1],
  F: [1, 1],
  R: [2, 1],
  B: [3, 1],
  D: [1, 2],
};
const colors: Record<Color, string> = {
  white: '#fff',
  yellow: '#ffda24',
  green: '#20a65a',
  blue: '#1969d2',
  red: '#e33443',
  orange: '#ff9529',
};
export function LabCubeNet({ facelets, label }: { facelets: FaceletSnapshot; label: string }) {
  return (
    <figure className="lab-net">
      <svg viewBox="0 0 260 200" role="img" aria-label={label}>
        <desc>
          Outside views. Up above Front; Left, Front, Right, Back in a row; Down below Front. Read
          each face left to right, top to bottom.
        </desc>
        {(Object.keys(positions) as Face[]).map((face) => {
          const [x, y] = positions[face];
          return (
            <g key={face} transform={`translate(${x * 65 + 2} ${y * 66 + 2})`}>
              <title>
                {face}: {facelets[face].join(', ')}
              </title>
              {facelets[face].map((color, i) => (
                <rect
                  key={i}
                  x={(i % 3) * 19}
                  y={Math.floor(i / 3) * 19}
                  width="18"
                  height="18"
                  rx="2"
                  fill={colors[color]}
                  stroke="#08264a"
                />
              ))}
              <rect x="20" y="20" width="16" height="16" fill="#fff" fillOpacity=".9" />
              <text x="28" y="32" textAnchor="middle" fontSize="11" fill="#08264a">
                {face}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption>
        {facelets.U[4]} up · {facelets.D[4]} bottom · {facelets.F[4]} front
      </figcaption>
    </figure>
  );
}
