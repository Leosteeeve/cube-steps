import type { Face } from '../../core/types';
import { FACE_GUIDES } from '../../core/facelet-layout';
import { COLORS } from '../../core/observations';
export function HoldingGuide({ face }: { face: Face }) {
  const front = COLORS[face],
    top = COLORS[FACE_GUIDES[face].top],
    right = COLORS[FACE_GUIDES[face].right];
  return (
    <div className="holding-guide">
      <svg
        viewBox="0 0 180 160"
        role="img"
        aria-label={`Hold the ${front} center toward you, ${top} above, ${right} to your right`}
      >
        <polygon points="22,45 85,15 150,45 87,77" data-color={top} />
        <polygon points="22,45 87,77 87,145 22,112" data-color={front} />
        <polygon points="87,77 150,45 150,112 87,145" data-color={right} />
        <circle cx="54" cy="95" r="11" fill="none" stroke="currentColor" strokeWidth="2" />
        <path
          d="M7 132 L39 110 M32 111 L39 110 L37 117"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
      <div>
        <strong>Hold by the centers</strong>
        <ul>
          <li>{front} center facing you</li>
          <li>{top} center above</li>
          <li>{right} center to your right</li>
        </ul>
        <p>Rotate the whole cube in your hands. Do not turn a layer.</p>
      </div>
    </div>
  );
}
