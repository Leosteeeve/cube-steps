import type { CubeEngine, CubeState } from '../../core/types';
import type { LastLayerMatch } from '../../algorithms/types';
import { canonicalHoldingMoves } from '../../core/holding-frame';
import { firstTwoLayersSolved } from '../shared/pieces';
import { relativePermutation } from '../cfop/stages';
import { RuleError } from '../shared/trace';
import { ollSignature } from './recognize-oll';
import { PLL_RECOGNITION } from '../../algorithms/data/pll';
export function pllSignature(engine: CubeEngine, state: CubeState): string {
  const p = relativePermutation(engine.observe(state));
  return p.corners.join('') + '|' + p.edges.join('');
}
export function recognizeAdvancedPLL(engine: CubeEngine, state: CubeState): LastLayerMatch | null {
  if (!firstTwoLayersSolved(engine, state))
    throw new RuleError('verification', 'advanced-pll', 'PLL requires completed F2L.');
  const holding = canonicalHoldingMoves(engine, state),
    held = engine.apply(state, holding);
  if (ollSignature(engine, held) !== 'UUUUUUUU')
    throw new RuleError('verification', 'advanced-pll', 'PLL requires completed OLL orientation.');
  const signature = pllSignature(engine, held);
  if (signature === '0123|0123') return null;
  const match = PLL_RECOGNITION[signature];
  if (!match)
    throw new RuleError(
      'unsupported-case',
      'advanced-pll',
      'No admitted PLL matches the relative piece permutation.',
    );
  return { ...match, setup: [...holding, ...match.setup] };
}
