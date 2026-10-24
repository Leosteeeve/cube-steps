import type { CubeEngine, SolveInput } from '../../core/types';
import { prepareLabInput, freezeLabValue } from '../../lab/input';
import type { RouxInput } from './types';
export function prepareRouxInput(engine: CubeEngine, source: SolveInput): RouxInput {
  const input = prepareLabInput(engine, source);
  return freezeLabValue({
    source: input.input,
    initial: input.initial,
    fingerprint: input.fingerprint,
    setupMoves: input.input.kind === 'scramble' ? [...input.input.moves] : null,
  });
}
