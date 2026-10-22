import { useMemo, useState } from 'react';
import type { CubeEngine } from '../../core/types';
import { rouxReferenceState } from '../../methods/roux/frame';
import { NotationPlayer } from '../moves/NotationPlayer';
export function RouxFoundation({ engine }: { engine: CubeEngine }) {
  const initial = useMemo(() => rouxReferenceState(engine), [engine]);
  const [amount, setAmount] = useState<'' | "'" | '2'>('');
  return (
    <section className="roux-foundation" aria-label="Middle-slice foundation">
      <h2>Meet the middle slice.</h2>
      <p>
        Keep blue on your left and green on your right. M turns only the slice between them, in the
        same direction as L: from this hold the yellow center travels from up toward front. M′
        reverses it: the white center travels from down toward front. M2 is a half turn.
      </p>
      <div role="group" aria-label="Middle-slice move">
        {(['', "'", '2'] as const).map((a) => (
          <button key={a} aria-pressed={amount === a} onClick={() => setAmount(a)}>
            M{a === "'" ? '′' : a}
          </button>
        ))}
      </div>
      <NotationPlayer
        engine={engine}
        initialState={initial}
        holdingLabel="Blue left · green right · white-bottom block frame"
        selection={{ base: 'M', amount }}
      />
      <p>
        Try M then M′ on your own cube; they undo each other. Try M2 twice. Predict where the front
        middle edge will travel before you play. Use Direction view to inspect from the left, then
        return to Holding view. Changing the camera never changes the physical move.
      </p>
      <p>
        Hold the two outer blocks lightly with both hands. Use a comfortable finger to push or pull
        the middle slice, pausing to regrip your fingers if needed. Do not rotate the whole cube or
        force a tense grip; this demonstration does not measure finger movement.
      </p>
    </section>
  );
}
