import type { RouxFrameId } from '../../methods/roux-advanced/types';
import { ROUX_FRAMES } from '../../methods/roux-advanced/frames';
export function OrientationPicker({
  frames,
  onChange,
}: {
  frames: readonly RouxFrameId[];
  onChange: (ids: readonly RouxFrameId[]) => void;
}) {
  return (
    <fieldset className="roux-orientations">
      <legend>Allowed starting holds</legend>
      <p>Choose familiar frames. The search reports which ones it actually explores.</p>
      <div className="roux-lab-actions">
        <button onClick={() => onChange(ROUX_FRAMES.map((f) => f.id))}>All eight</button>
        <button onClick={() => onChange(['white-blue'])}>White / blue only</button>
      </div>
      <div className="roux-frame-grid">
        {ROUX_FRAMES.map((f) => (
          <label key={f.id}>
            <input
              type="checkbox"
              checked={frames.includes(f.id)}
              disabled={frames.length === 1 && frames[0] === f.id}
              onChange={(e) =>
                onChange(e.target.checked ? [...frames, f.id] : frames.filter((id) => id !== f.id))
              }
            />
            {f.bottom} bottom · {f.left} left
          </label>
        ))}
      </div>
    </fieldset>
  );
}
