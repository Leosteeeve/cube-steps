import type { CubeEngine, CubeState } from '../../core/types';
import type { LastLayerMatch } from '../../algorithms/types';
import { canonicalHoldingMoves } from '../../core/holding-frame';
import { firstTwoLayersSolved } from '../shared/pieces';
import { RuleError } from '../shared/trace';
import { OLL_RECOGNITION } from '../../algorithms/data/oll';
const EDGES = ['UF', 'UR', 'UB', 'UL'],
  CORNERS = ['UFR', 'URB', 'UBL', 'ULF'];
export function ollSignature(engine: CubeEngine, state: CubeState): string {
  const o = engine.observe(state);
  return [
    ...EDGES.map((slot) => o.edges.find((p) => p.slot === slot)!),
    ...CORNERS.map((slot) => o.corners.find((p) => p.slot === slot)!),
  ]
    .map((p) => Object.entries(p.stickers).find(([, c]) => c === 'yellow')?.[0] ?? '?')
    .join('');
}
export function recognizeAdvancedOLL(engine: CubeEngine, state: CubeState): LastLayerMatch | null {
  if (!firstTwoLayersSolved(engine, state))
    throw new RuleError(
      'verification',
      'advanced-oll',
      'OLL recognition requires completed first two layers (F2L).',
    );
  const holding = canonicalHoldingMoves(engine, state),
    signature = ollSignature(engine, engine.apply(state, holding));
  if (signature === 'UUUUUUUU') return null;
  const match = OLL_RECOGNITION[signature];
  if (!match)
    throw new RuleError(
      'unsupported-case',
      'advanced-oll',
      'No admitted OLL pattern matches the yellow sticker directions.',
    );
  return { ...match, setup: [...holding, ...match.setup] };
}
