import { useEffect, useState } from 'react';
import { createCubeEngine } from '../core/cube';
import type { CubeEngine, SolveSession, StageId } from '../core/types';
import { solveLBL } from '../methods/lbl/solve';
import { LBL_STAGE_IDS } from '../methods/lbl/stages';
import { CubePlayer } from './CubePlayer';
export default function PlayerFixture() {
  const [data, setData] = useState<{ engine: CubeEngine; session: SolveSession } | null>(null),
    [stage, setStage] = useState<StageId>('white-cross');
  useEffect(() => {
    void createCubeEngine().then((engine) => {
      const scrambleMoves = ['R', 'U2', "F'"] as const;
      const result = solveLBL(engine, engine.apply(engine.solved(), scrambleMoves));
      if (result.ok)
        setData({
          engine,
          session: { input: { kind: 'scramble', moves: [...scrambleMoves] }, trace: result.trace },
        });
    });
  }, []);
  return (
    <main style={{ maxWidth: 1100, margin: 'auto', fontFamily: 'system-ui' }}>
      <h1>CubeSteps playback check</h1>
      <label>
        Stage
        <select
          aria-label="Stage"
          value={stage}
          onChange={(e) => setStage(e.target.value as StageId)}
        >
          {LBL_STAGE_IDS.map((id) => (
            <option key={id}>{id}</option>
          ))}
        </select>
      </label>
      {data && <CubePlayer {...data} stage={stage} />}
      <style>
        {
          '.cube-canvas{height:400px}.playback-controls{display:flex;gap:16px}.explanation{max-width:500px}.algorithm-moves{display:flex;gap:8px}.player-area{display:grid;grid-template-columns:1fr 1fr;gap:30px}button,select{padding:12px}'
        }
      </style>
    </main>
  );
}
