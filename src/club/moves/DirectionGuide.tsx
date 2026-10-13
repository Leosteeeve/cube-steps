import { FACE_WORDS, NOTATION_ENTRIES, type NotationSelection } from './catalog';
export function DirectionGuide({ selection }: { selection: NotationSelection }) {
  const entry = NOTATION_ENTRIES.find((value) => value.base === selection.base)!;
  const half = selection.amount === '2',
    prime = selection.amount === "'";
  return (
    <div className="notation-direction">
      <svg viewBox="0 0 72 72" aria-hidden="true">
        <rect x="21" y="21" width="30" height="30" rx="7" fill="#e8effc" />
        <text x="36" y="42" textAnchor="middle" fill="#143962" fontSize="18">
          {entry.referenceFace}
        </text>
        <g
          transform={prime ? 'translate(72 0) scale(-1 1)' : undefined}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={half ? 'M36 8 A28 28 0 0 1 36 64' : 'M36 8 A28 28 0 0 1 64 36'} />
          <path d={half ? 'M42 58 L36 64 L42 70' : 'M58 30 L64 36 L70 30'} />
        </g>
      </svg>
      <div>
        <strong>
          {half ? '180° · either direction' : prime ? '90° counterclockwise' : '90° clockwise'}
        </strong>
        <p>
          Looking at the {FACE_WORDS[entry.referenceFace]} ({entry.referenceFace}) face from
          outside.
        </p>
        <small>This reference diagram stays fixed when you drag the cube.</small>
      </div>
    </div>
  );
}
