import type { CubeEngine, SolveTrace, TeachingMove, TraceAction } from '../../core/types';

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

export function joinTeachingActions(engine: CubeEngine, sources: TraceAction[]): TraceAction {
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
    state = engine.apply(state, source.moves);
    if (!engine.equals(state, source.after)) throw Error('Incorrect reference endpoint.');
  }
  const original = sources.flatMap((a) => a.moves),
    moves = combineAdjacentTurns(original);
  if (
    original.length > 4096 ||
    moves.length >= original.length ||
    !engine.equals(engine.apply(first.before, moves), last.after)
  )
    throw Error('The connected sequence must save turns and preserve its endpoint.');
  const savedMoves = original.length - moves.length;
  const samePair =
    first.pair &&
    sources.every(
      (a) => a.pair?.cornerId === first.pair!.cornerId && a.pair?.edgeId === first.pair!.edgeId,
    );
  const allRoux = first.roux && last.roux && sources.every((a) => a.roux);
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

export function compactTeachingTrace(engine: CubeEngine, trace: SolveTrace): SolveTrace {
  return {
    ...trace,
    stages: trace.stages.map((stage) => {
      // Cross distance evidence and the initial holding lesson stay atomic.
      if (stage.id === 'advanced-cross' || stage.id === 'roux-frame') return stage;
      const actions: TraceAction[] = [];
      for (const action of stage.actions) {
        actions.push(action);
        while (actions.length >= 2) {
          const right = actions.at(-1)!,
            left = actions.at(-2)!;
          if (
            !left.moves.length ||
            !right.moves.length ||
            family(left.moves.at(-1)!) !== family(right.moves[0])
          )
            break;
          const joined = joinTeachingActions(engine, [
            ...(left.joined?.sources ?? [left]),
            ...(right.joined?.sources ?? [right]),
          ]);
          actions.splice(-2, 2);
          if (joined.moves.length) actions.push(joined);
        }
      }
      return {
        ...stage,
        actions,
        ...(actions.length
          ? {}
          : {
              status: 'skipped' as const,
              skipReason:
                stage.skipReason ??
                'The separate setup turns cancel; this stage already meets its goal.',
            }),
      };
    }),
  };
}
