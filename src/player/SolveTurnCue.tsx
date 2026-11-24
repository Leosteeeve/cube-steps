import type { TeachingMove } from '../core/types';
import { FACE_WORDS, NOTATION_ENTRIES } from '../club/moves/catalog';

const rotationAxes = { x: 'left–right', y: 'top–bottom', z: 'front–back' };

export function SolveTurnCue({ move }: { move: TeachingMove }) {
  const entry = NOTATION_ENTRIES.find((item) => item.base === move.replace(/[2']/g, ''))!;
  const direction = move.endsWith('2')
    ? 'Half turn'
    : move.endsWith("'")
      ? 'Quarter turn counterclockwise'
      : 'Quarter turn clockwise';
  return (
    <div className="solve-turn-cue" aria-label="Turn to follow">
      <code>{move.replace("'", '′')}</code>
      <div>
        <strong>{entry.family === 'rotation' ? 'Rotate the whole cube' : entry.name}</strong>
        <span>
          {direction}
          {move.endsWith('2') &&
            entry.family === 'rotation' &&
            ` about the ${rotationAxes[entry.axis]} axis`}
          {!move.endsWith('2') &&
            ` as seen from the ${FACE_WORDS[entry.referenceFace].toLowerCase()} face`}
        </span>
      </div>
    </div>
  );
}
