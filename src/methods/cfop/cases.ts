import type { CFOPStageId, CubeEngine, CubeState, TeachingMove } from '../../core/types';
import { invertTeachingMoves } from '../../core/teaching-moves';
import { CFOP_ALGORITHMS, LAST_LAYER_CASES } from './catalog';
import {
  CFOP_STAGE_IDS,
  checkCFOPStage,
  relativePermutation,
  TOP_CORNERS,
  TOP_EDGES,
} from './stages';
export interface LastLayerMatch {
  caseId: string;
  algorithmId: string;
  setup: TeachingMove[];
  recognition: string;
}
export function lastLayerSignature(
  engine: CubeEngine,
  state: CubeState,
  stage: CFOPStageId,
): string {
  const o = engine.observe(state);
  switch (stage) {
    case 'cfop-oll-edges':
      return TOP_EDGES.map((slot) =>
        o.edges.find((p) => p.slot === slot)!.stickers.U === 'yellow' ? '1' : '0',
      ).join('');
    case 'cfop-oll-corners':
      return TOP_CORNERS.map(
        (slot) =>
          Object.entries(o.corners.find((p) => p.slot === slot)!.stickers).find(
            ([, color]) => color === 'yellow',
          )?.[0],
      ).join('');
    case 'cfop-pll-corners':
      return relativePermutation(o).corners.join('');
    case 'cfop-pll-edges':
      return relativePermutation(o).edges.join('');
    default:
      return '';
  }
}
const references = new WeakMap<CubeEngine, Map<string, string>>();
function referenceSignatures(engine: CubeEngine): Map<string, string> {
  let signatures = references.get(engine);
  if (!signatures) {
    signatures = new Map(
      LAST_LAYER_CASES.map((entry) => [
        entry.id,
        lastLayerSignature(
          engine,
          engine.apply(engine.solved(), [
            'x2',
            ...invertTeachingMoves(CFOP_ALGORITHMS[entry.id].moves),
          ]),
          entry.stage,
        ),
      ]),
    );
    references.set(engine, signatures);
  }
  return signatures;
}
export function recognizeLastLayer(
  engine: CubeEngine,
  state: CubeState,
  stage: CFOPStageId,
): LastLayerMatch | null {
  const index = CFOP_STAGE_IDS.indexOf(stage);
  if (
    index < 2 ||
    index > 5 ||
    engine.observe(state).centers.D !== 'white' ||
    !checkCFOPStage(engine, state, CFOP_STAGE_IDS[index - 1]) ||
    checkCFOPStage(engine, state, stage)
  )
    return null;
  const patterns = referenceSignatures(engine);
  const turns: TeachingMove[][] = [[], ['U'], ['U2'], ["U'"]];
  const frames: TeachingMove[][] = [[], ['y'], ['y2'], ["y'"]];
  for (const y of frames)
    for (const u of turns) {
      const setup = [...y, ...u];
      const prepared = engine.apply(state, setup);
      const signature = lastLayerSignature(engine, prepared, stage);
      const entry = LAST_LAYER_CASES.find(
        (c) => c.stage === stage && patterns.get(c.id) === signature,
      );
      if (entry) {
        const o = engine.observe(state);
        const evidence = (stage.endsWith('edges') ? o.edges : o.corners)
          .filter((p) => p.slot.includes('U'))
          .map(
            (p) =>
              `${p.slot}: ${Object.entries(p.stickers)
                .map(([f, c]) => `${f} ${c}`)
                .join(', ')}`,
          )
          .join('; ');
        return {
          caseId: entry.id,
          algorithmId: entry.id,
          setup,
          recognition: `${CFOP_ALGORITHMS[entry.id].name}. Observed ${evidence}. Prepared pattern: ${signature}.`,
        };
      }
    }
  return null;
}
