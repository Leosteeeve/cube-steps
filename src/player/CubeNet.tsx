import type { Color, Face, FaceletRef, FaceletSnapshot } from '../core/types';
const positions: Record<Face, readonly [number, number]> = {
  U: [1, 0],
  L: [0, 1],
  F: [1, 1],
  R: [2, 1],
  B: [3, 1],
  D: [1, 2],
};
import { CUBE_COLORS as colors } from '../ui/cube-colors';
export function CubeNet({
  facelets,
  targets,
  holdingLabel,
}: {
  facelets: FaceletSnapshot;
  targets: readonly FaceletRef[];
  holdingLabel: string;
}) {
  const marked = new Set(targets.map((t) => `${t.face}${t.index + 1}`));
  return (
    <figure className="cube-net">
      <svg viewBox="0 0 316 240" role="img" aria-label={`Six-face view · ${holdingLabel}`}>
        {(Object.entries(positions) as [Face, readonly [number, number]][]).map(
          ([face, [col, row]]) => (
            <g key={face} transform={`translate(${col * 80 + 1},${row * 80 + 1})`}>
              {facelets[face].map((color, index) => {
                const id = `${face}${index + 1}`,
                  target = marked.has(id);
                return (
                  <g
                    key={index}
                    transform={`translate(${(index % 3) * 24},${Math.floor(index / 3) * 24})`}
                    data-facelet={id}
                    data-color={color}
                    data-target={target ? 'true' : undefined}
                  >
                    <title>
                      {id}: {color}
                      {target ? ' · target piece' : ''}
                    </title>
                    <rect
                      x="1"
                      y="1"
                      width="22"
                      height="22"
                      rx="2"
                      fill={colors[color]}
                      stroke="#173047"
                      strokeWidth="1"
                    />
                    {target && (
                      <circle
                        className="cube-net-target-mark"
                        cx="12"
                        cy="12"
                        r="4"
                        fill="#112739"
                        stroke="white"
                        strokeWidth="1.5"
                      />
                    )}
                    {index === 4 && (
                      <text
                        x="12"
                        y="16"
                        textAnchor="middle"
                        fontSize="12"
                        fontWeight="700"
                        fill="#102235"
                      >
                        {face}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          ),
        )}
      </svg>
      <figcaption>
        Six faces, from the outside. <span>● Target piece</span>
        <br />
        {holdingLabel}
      </figcaption>
    </figure>
  );
}
