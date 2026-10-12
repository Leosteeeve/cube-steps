import { useEffect, useState } from 'react';
import { createCubeEngine } from '../core/cube';
import type { CubeEngine, SolveSession, StageId } from '../core/types';
import { solveLBL } from '../methods/lbl/solve';
import { LBL_STAGE_IDS } from '../methods/lbl/stages';
import { solveCFOP } from '../methods/cfop/solve';
import { CFOP_STAGE_IDS } from '../methods/cfop/stages';
import { CFOP_ALGORITHMS } from '../methods/cfop/catalog';
import { invertTeachingMoves } from '../core/teaching-moves';
import { stateToFacelets } from '../core/facelets';
import { CubePlayer } from './CubePlayer';
export default function PlayerFixture() {
  const [data, setData] = useState<{ engine: CubeEngine; session: SolveSession } | null>(null),
    [stage, setStage] = useState<StageId>('white-cross'),
    [fixture, setFixture] = useState('lbl');
  useEffect(() => {
    let live = true;
    setData(null);
    void createCubeEngine().then((engine) => {
      const scrambleMoves = fixture === 'cfop-solved' ? [] : (['R', 'U2', "F'"] as const);
      const slice = fixture === 'pll-h' || fixture === 'pll-z';
      const initial = slice
        ? engine.apply(engine.solved(), [
            'x2',
            ...invertTeachingMoves(CFOP_ALGORITHMS[fixture].moves),
            'x2',
          ])
        : engine.apply(engine.solved(), scrambleMoves);
      const result = fixture === 'lbl' ? solveLBL(engine, initial) : solveCFOP(engine, initial);
      if (result.ok && live) {
        setStage(
          fixture === 'lbl'
            ? 'white-cross'
            : slice
              ? 'cfop-pll-edges'
              : fixture === 'cfop-solved'
                ? 'cfop-auf'
                : 'cfop-f2l',
        );
        setData({
          engine,
          session: {
            input: slice
              ? { kind: 'facelets', facelets: stateToFacelets(initial) }
              : { kind: 'scramble', moves: [...scrambleMoves] },
            trace: result.trace,
          },
        });
      }
    });
    return () => {
      live = false;
    };
  }, [fixture]);
  return (
    <main style={{ maxWidth: 1100, margin: 'auto', fontFamily: 'system-ui' }}>
      <h1>CubeSteps playback check</h1>
      <label>
        Fixture{' '}
        <select aria-label="Fixture" value={fixture} onChange={(e) => setFixture(e.target.value)}>
          {['lbl', 'cfop-scramble', 'cfop-solved', 'pll-h', 'pll-z'].map((id) => (
            <option key={id}>{id}</option>
          ))}
        </select>
      </label>
      <label>
        Stage
        <select
          aria-label="Stage"
          value={stage}
          onChange={(e) => setStage(e.target.value as StageId)}
        >
          {(fixture === 'lbl' ? LBL_STAGE_IDS : CFOP_STAGE_IDS).map((id) => (
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
