import { useId } from 'react';
import type { CubeState, Face, Color } from '../../core/types';
import { observeState, CENTER_SLOTS } from '../../core/observations';
import { FACELET_LAYOUT, FACE_NAMES } from '../../core/facelet-layout';
import { CUBE_COLORS as palette } from '../../ui/cube-colors';
const letters: Record<Color, string> = {
  white: 'W',
  yellow: 'Y',
  green: 'G',
  blue: 'B',
  red: 'R',
  orange: 'O',
};
export function CaseDiagram({
  state,
  targets,
  hideIdentity = false,
}: {
  state: CubeState;
  targets: readonly string[];
  hideIdentity?: boolean;
}) {
  const id = useId(),
    o = observeState(state),
    pair = targets.length === 2,
    cell = 20;
  const items: { face: Face; index: number; x: number; y: number }[] = [];
  if (pair) {
    for (const [face, x, y] of [
      ['U', 70, 20],
      ['L', 0, 100],
      ['F', 70, 100],
      ['R', 140, 100],
      ['B', 210, 100],
      ['D', 70, 180],
    ] as const)
      for (let i = 0; i < 9; i++)
        items.push({ face, index: i, x: x + (i % 3) * cell, y: y + Math.floor(i / 3) * cell });
  } else {
    for (let i = 0; i < 9; i++)
      items.push({ face: 'U', index: i, x: 40 + (i % 3) * cell, y: 40 + Math.floor(i / 3) * cell });
    for (let i = 0; i < 3; i++) {
      items.push(
        { face: 'B', index: 2 - i, x: 40 + i * cell, y: 12 },
        { face: 'F', index: i, x: 40 + i * cell, y: 108 },
        { face: 'L', index: i, x: 12, y: 40 + i * cell },
        { face: 'R', index: 2 - i, x: 108, y: 40 + i * cell },
      );
    }
  }
  const stickers = items.map((item) => {
    const pos = FACELET_LAYOUT[item.face][item.index],
      center = pos.orbit === 'CENTERS';
    const piece = center ? undefined : (pos.orbit === 'EDGES' ? o.edges : o.corners)[pos.slot];
    const color = center ? o.centers[item.face] : piece!.stickers[item.face]!;
    const visible = center || !targets.length || targets.includes(piece!.id);
    return { ...item, piece: piece?.id ?? CENTER_SLOTS[pos.slot], color, visible };
  });
  const description = stickers
    .filter((s) => s.visible)
    .map((s) => FACE_NAMES[s.face] + ' ' + (s.index + 1) + ': ' + s.color)
    .join('; ');
  return (
    <svg
      className="case-diagram"
      viewBox={pair ? ' -5 -3 280 250' : '0 0 140 143'}
      role="img"
      aria-labelledby={id + '-title'}
      aria-describedby={id + '-description'}
      data-neutral={hideIdentity || undefined}
    >
      <title id={id + '-title'}>Recognition view</title>
      <desc id={id + '-description'}>
        {(pair
          ? 'Unfolded cube. Outlined stickers belong to the selected corner and edge. Other pieces are muted. '
          : 'Top face with the adjacent side stickers. ') +
          'Letters name colors: W white, Y yellow, G green, B blue, R red, O orange. ' +
          description}
      </desc>
      {stickers.map((s) => (
        <g
          key={s.face + s.index}
          data-piece={s.piece}
          data-face={s.face}
          data-color={s.visible ? s.color : 'hidden'}
        >
          <rect
            x={s.x}
            y={s.y}
            width="18"
            height="18"
            rx="2"
            fill={s.visible ? palette[s.color] : '#e6ebe5'}
            stroke={pair && targets.includes(s.piece) ? '#253f38' : '#8b9b8f'}
            strokeWidth={pair && targets.includes(s.piece) ? 1.8 : 0.6}
          />
          {s.visible && (
            <text
              x={s.x + 9}
              y={s.y + 12}
              textAnchor="middle"
              fontSize="9"
              fill="#20332c"
              aria-hidden="true"
            >
              {letters[s.color]}
            </text>
          )}
        </g>
      ))}
      {pair ? (
        (
          [
            ['U', 100, 15],
            ['L', 30, 95],
            ['F', 100, 95],
            ['R', 170, 95],
            ['B', 240, 95],
            ['D', 100, 175],
          ] as const
        ).map(([f, x, y]) => (
          <text key={f} x={x} y={y} textAnchor="middle" fontSize="9">
            {f}
          </text>
        ))
      ) : (
        <>
          <text x="70" y="8" textAnchor="middle" fontSize="8">
            B
          </text>
          <text x="70" y="139" textAnchor="middle" fontSize="8">
            F
          </text>
          <text x="5" y="75" fontSize="8">
            L
          </text>
          <text x="131" y="75" fontSize="8">
            R
          </text>
        </>
      )}
    </svg>
  );
}
