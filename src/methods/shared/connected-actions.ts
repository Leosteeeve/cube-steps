import type { CubeEngine, TeachingMove, TraceAction } from '../../core/types';
import { TEACHING_WORK, drainTeachingSteps, applyTeachingSteps, type TeachingWork } from './work';

const family = (move: TeachingMove) => move.replace(/[2']/g, '');
const amount = (move: TeachingMove) => (move.endsWith('2') ? 2 : move.endsWith("'") ? 3 : 1);

// Only combine adjacent turns of the identical layer (or rotation axis).
// Never commute turns, change a hold, or substitute a different algorithm.
export function combineAdjacentTurns(moves: readonly TeachingMove[]): TeachingMove[] {
  const result: TeachingMove[] = [];
  for (const move of moves) {
    const previous = result.at(-1);
    if (!previous || family(previous) !== family(move)) {
      result.push(move);
      continue;
    }
    result.pop();
    const turns = (amount(previous) + amount(move)) % 4;
    if (turns) result.push((family(move) + ['', '', '2', "'"][turns]) as TeachingMove);
  }
  return result;
}

export function* joinTeachingActionsSteps(
  engine: CubeEngine,
  sources: TraceAction[],
): Generator<TeachingWork, TraceAction> {
  if (
    sources.length < 2 ||
    sources.length > 512 ||
    sources.some((a) => a.joined || a.kind === 'joined')
  )
    throw Error('A connected sequence needs bounded, original teaching actions.');
  const first = sources[0],
    last = sources.at(-1)!;
  let state = first.before;
  for (const source of sources) {
    if (!engine.equals(state, source.before)) throw Error('Disconnected reference actions.');
    state = yield* applyTeachingSteps(engine, state, source.moves);
    if (!engine.equals(state, source.after)) throw Error('Incorrect reference endpoint.');
  }
  const original = sources.flatMap((a) => a.moves),
    moves = combineAdjacentTurns(original);
  const endpoint = yield* applyTeachingSteps(engine, first.before, moves);
  if (
    original.length > 4096 ||
    moves.length >= original.length ||
    !engine.equals(endpoint, last.after)
  )
    throw Error('The connected sequence must save turns and preserve its endpoint.');
  const savedMoves = original.length - moves.length;
  const samePair =
    first.pair &&
    sources.every(
      (a) => a.pair?.cornerId === first.pair!.cornerId && a.pair?.edgeId === first.pair!.edgeId,
    );
  const allRoux = first.roux && last.roux && sources.every((a) => a.roux);
  const allAdvancedRoux =
    first.rouxAdvanced &&
    last.rouxAdvanced &&
    sources.every((a) => a.rouxAdvanced?.frameId === first.rouxAdvanced!.frameId);
  return {
    kind: 'joined',
    ruleId: 'connected-teaching-actions',
    caseId: last.caseId,
    targets: [...new Set(sources.flatMap((a) => a.targets))],
    recognition: first.recognition,
    explanation: `Connect these teaching steps: adjacent turns of the same layer cancel or combine, saving ${savedMoves} moves. Follow the connected moves below once. Check the result at the end; the separate reference checkpoints are not stops in this sequence.`,
    moves,
    before: first.before,
    after: last.after,
    checkpoint: {
      ...last.checkpoint,
      description: `After the complete connected sequence: ${last.checkpoint.description}`,
    },
    joined: { sources, savedMoves },
    ...(allAdvancedRoux
      ? {
          rouxAdvanced: {
            ...last.rouxAdvanced!,
            protectedIds: first.rouxAdvanced!.protectedIds.filter((id) =>
              sources.every((a) => a.rouxAdvanced!.protectedIds.includes(id)),
            ),
            protection: 'endpoint' as const,
            centerPhaseBefore: first.rouxAdvanced!.centerPhaseBefore,
            cornerOffsetBefore: first.rouxAdvanced!.cornerOffsetBefore,
          },
        }
      : {}),
    ...(samePair
      ? {
          pair: {
            ...last.pair!,
            slot: first.pair!.slot,
            ordinal: first.pair!.ordinal,
            solvedBefore: first.pair!.solvedBefore,
          },
        }
      : {}),
    ...(allRoux
      ? {
          roux: {
            ...last.roux!,
            protectedIds: first.roux!.protectedIds.filter((id) =>
              sources.every((a) => a.roux!.protectedIds.includes(id)),
            ),
            protection: 'endpoint' as const,
            centerPhaseBefore: first.roux!.centerPhaseBefore,
            cornerOffsetBefore: first.roux!.cornerOffsetBefore,
            temporaryNote:
              'Finish the connected sequence before checking the protected pieces. Separate reference checkpoints have been joined.',
          },
        }
      : {}),
  };
}
export function joinTeachingActions(engine: CubeEngine, sources: TraceAction[]): TraceAction {
  return drainTeachingSteps(joinTeachingActionsSteps(engine, sources));
}
