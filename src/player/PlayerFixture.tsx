import { useEffect, useState } from 'react';
import { createCubeEngine } from '../core/cube';
import type { CubeEngine, StageId, FaceMove } from '../core/types';
import { solveLBL } from '../methods/lbl/solve';
import { LBL_STAGE_IDS } from '../methods/lbl/stages';
import { solveCFOP } from '../methods/cfop/solve';
import { CFOP_STAGE_IDS } from '../methods/cfop/stages';
import { CFOP_ALGORITHMS } from '../methods/cfop/catalog';
import { solveAdvancedCFOP } from '../methods/advanced/solve';
import { ADVANCED_STAGE_IDS } from '../methods/advanced/stages';
import { loadAdvancedAssets } from '../methods/advanced/assets';
import { invertTeachingMoves } from '../core/teaching-moves';
import { stateToFacelets } from '../core/facelets';
import { CubePlayer } from './CubePlayer';
import { AlgorithmPlayer } from './AlgorithmPlayer';
import { createDemonstration } from '../algorithms/demonstration';
import { getCaseFixture } from '../algorithms/fixtures';
import type { PlaybackSource } from './playback-source';
const DEMOS: Record<string, [string, string]> = {
  'demo-oll-20': ['oll-20/u1', 'oll-20/main'],
  'demo-oll-28': ['oll-28/u0', 'oll-28/main'],
  'demo-oll-45': ['oll-45/u0', 'oll-45/main'],
  'demo-pll-h': ['pll-h/u1', 'pll-h/main'],
  'demo-pll-z': ['pll-z/u0', 'pll-z/main'],
  'demo-pll-aa': ['pll-aa/u0', 'pll-aa/main'],
  'demo-f2l-mixed': ['f2l-01/fr/mixed/u0', 'f2l-01/main/fr'],
  'demo-f2l-back': ['f2l-01/fr/u0', 'f2l-01/main/br'],
  'demo-f2l-rotation': ['f2l-03/fr/u0', 'f2l-03/main/fr'],
};
export default function PlayerFixture() {
  const [data, setData] = useState<{ engine: CubeEngine; source: PlaybackSource } | null>(null),
    [stage, setStage] = useState<StageId>('white-cross'),
    [fixture, setFixture] = useState('lbl'),
    [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    const abort = new AbortController();
    setData(null);
    setError('');
    void createCubeEngine()
      .then(async (engine) => {
        const demo = DEMOS[fixture];
        if (demo) {
          if (live)
            setData({
              engine,
              source: {
                kind: 'algorithm',
                demonstration: createDemonstration(engine, getCaseFixture(demo[0])!, demo[1]),
              },
            });
          return;
        }
        const advanced = fixture.startsWith('advanced-'),
          solved = fixture.endsWith('-solved');
        const scrambleMoves: readonly FaceMove[] = solved
          ? []
          : fixture === 'advanced-colors'
            ? ("R U R' F2 D L2 U' B R2 D' F U2 L' B2 R F' D2 L U B'".split(' ') as FaceMove[])
            : ['R', 'U2', "F'"];
        const slice = fixture === 'pll-h' || fixture === 'pll-z';
        const initial = slice
          ? engine.apply(engine.solved(), [
              'x2',
              ...invertTeachingMoves(CFOP_ALGORITHMS[fixture].moves),
              'x2',
            ])
          : engine.apply(engine.solved(), scrambleMoves);
        const result =
          fixture === 'lbl'
            ? solveLBL(engine, initial)
            : advanced
              ? solveAdvancedCFOP(engine, initial, await loadAdvancedAssets(fetch, abort.signal))
              : solveCFOP(engine, initial);
        if (!result.ok) throw new Error(result.message);
        if (live) {
          setStage(
            fixture === 'lbl'
              ? 'white-cross'
              : advanced
                ? 'advanced-cross'
                : slice
                  ? 'cfop-pll-edges'
                  : solved
                    ? 'cfop-auf'
                    : 'cfop-f2l',
          );
          setData({
            engine,
            source: {
              kind: 'solve',
              session: {
                input:
                  slice || fixture === 'advanced-colors'
                    ? { kind: 'facelets', facelets: stateToFacelets(initial) }
                    : { kind: 'scramble', moves: [...scrambleMoves] },
                trace: result.trace,
              },
            },
          });
        }
      })
      .catch((e) => {
        if (live) setError(e instanceof Error ? e.message : 'Fixture failed.');
      });
    return () => {
      live = false;
      abort.abort();
    };
  }, [fixture]);
  const stages =
    fixture === 'lbl'
      ? LBL_STAGE_IDS
      : fixture.startsWith('advanced-')
        ? ADVANCED_STAGE_IDS
        : CFOP_STAGE_IDS;
  return (
    <main style={{ maxWidth: 1100, margin: 'auto', fontFamily: 'system-ui', padding: 16 }}>
      <h1>CubeSteps playback check</h1>
      <label>
        Fixture{' '}
        <select aria-label="Fixture" value={fixture} onChange={(e) => setFixture(e.target.value)}>
          {[
            'lbl',
            'cfop-scramble',
            'cfop-solved',
            'pll-h',
            'pll-z',
            'advanced-scramble',
            'advanced-colors',
            'advanced-solved',
            ...Object.keys(DEMOS),
          ].map((id) => (
            <option key={id}>{id}</option>
          ))}
        </select>
      </label>
      {!DEMOS[fixture] && (
        <label>
          Stage{' '}
          <select
            aria-label="Stage"
            value={stage}
            onChange={(e) => setStage(e.target.value as StageId)}
          >
            {stages.map((id) => (
              <option key={id}>{id}</option>
            ))}
          </select>
        </label>
      )}
      {error && <p role="alert">{error}</p>}
      {data &&
        (data.source.kind === 'solve' ? (
          <CubePlayer engine={data.engine} session={data.source.session} stage={stage} />
        ) : data.source.kind === 'algorithm' ? (
          <AlgorithmPlayer engine={data.engine} demonstration={data.source.demonstration} />
        ) : null)}
      <style>
        {
          '.cube-canvas{height:400px}.playback-controls{display:flex;gap:12px;flex-wrap:wrap}.explanation{max-width:500px;min-width:0}.algorithm-moves{display:flex;gap:8px;flex-wrap:wrap}.player-area{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:30px}button,select{padding:12px} @media(max-width:700px){.player-area{grid-template-columns:minmax(0,1fr)}.cube-canvas{height:330px}}'
        }
      </style>
    </main>
  );
}
