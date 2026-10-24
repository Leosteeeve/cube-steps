import type { CubeEngine, CubeState, TeachingMove } from '../../../core/types';
import { invertTeachingMoves } from '../../../core/teaching-moves';
import { meterRouxEngine, RouxBudgetStop } from '../budget';
import type { RouxFrame, RouxSearchBudget } from '../types';
import { STM_MOVES } from '../blocks/coordinates';
import { validateRouxExecutionCatalog } from './catalog';
import type {
  RouxExecutionCatalog,
  RouxExecutionEvent,
  RouxExecutionProfile,
  RouxExecutionScore,
  RouxExecutionSegment,
} from './types';
type Rated = Extract<RouxExecutionScore, { rated: true }>;
type Path = { grip: string; score: Rated };
const zero = (): Rated => ({
  rated: true,
  modelVersion: 'roux-execution-v1',
  T: 0,
  R: 0,
  G: 0,
  V: 0,
  A: 0,
  cost: 0,
  events: [],
});
const textOrder = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const rank = (a: Path, b: Path) =>
  a.score.cost - b.score.cost ||
  a.score.G - b.score.G ||
  textOrder(a.grip, b.grip) ||
  textOrder(
    a.score.events.map((e) => e.profileId).join('|'),
    b.score.events.map((e) => e.profileId).join('|'),
  );
function regrips(c: RouxExecutionCatalog, b: RouxSearchBudget) {
  const all = new Map<string, Map<string, readonly RouxExecutionEvent[]>>();
  for (const grip of c.grips) {
    const paths = new Map<string, readonly RouxExecutionEvent[]>([[grip.id, []]]),
      queue = [grip.id];
    for (let i = 0; i < queue.length; i++)
      for (const p of c.profiles) {
        if (p.moves.length || p.entryGrip !== queue[i]) continue;
        b.charge('score');
        if (!paths.has(p.exitGrip)) {
          paths.set(p.exitGrip, [...paths.get(p.entryGrip)!, ...p.events]);
          queue.push(p.exitGrip);
        }
      }
    all.set(grip.id, paths);
  }
  return all;
}
function needsLook(e: CubeEngine, s: RouxExecutionSegment): boolean {
  if (!s.targets.length) return false;
  const o = e.observe(s.before),
    pieces = [...o.edges, ...o.corners];
  const targets = s.targets.map((id) => {
    const p = pieces.find((p) => p.id === id);
    if (!p) throw Error('Missing physical recognition target.');
    return p;
  });
  return !['UFR', 'UFL'].some((view) =>
    targets.every((p) => Object.keys(p.stickers).filter((f) => view.includes(f)).length >= 2),
  );
}
export function scoreRouxExecution(
  engine: CubeEngine,
  segments: readonly RouxExecutionSegment[],
  frame: RouxFrame,
  catalog: RouxExecutionCatalog,
  budget: RouxSearchBudget,
): RouxExecutionScore {
  const e = meterRouxEngine(engine, budget);
  try {
    validateRouxExecutionCatalog(catalog, budget);
    if (!frame.id) throw Error('Missing execution frame.');
    const handling = regrips(catalog, budget),
      tokens = new Map<string, RouxExecutionProfile[]>();
    for (const p of catalog.profiles)
      if (p.moves.length) {
        const list = tokens.get(p.moves[0]) ?? [];
        list.push(p);
        tokens.set(p.moves[0], list);
      }
    let paths: Path[] = [{ grip: catalog.neutralGrip, score: zero() }],
      boundary = 0,
      expected: CubeState | undefined;
    for (const segment of segments) {
      if (expected && !e.equals(expected, segment.before))
        throw Error('Execution segments do not replay continuously.');
      expected = e.apply(segment.before, segment.moves);
      if (segment.phase === 'corners-edges') {
        boundary += segment.moves.length;
        continue;
      }
      const blocks = segment.phase === 'blocks';
      if (blocks && needsLook(e, segment))
        paths = paths.map((p) => ({
          grip: p.grip,
          score: {
            ...p.score,
            V: p.score.V + 1,
            cost: p.score.cost + 2,
            events: [
              ...p.score.events,
              {
                boundary,
                kind: 'visibility',
                profileId: 'recognition',
                fromGrip: p.grip,
                toGrip: p.grip,
                instruction:
                  'Look around the cube to identify the target stickers; they do not all fit one front view.',
              },
            ],
          },
        }));
      for (const move of segment.moves) {
        const profiles = tokens.get(move);
        if (!profiles?.length)
          return { rated: false, reason: `No admitted execution profile for ${move}.` };
        const next = new Map<string, Path>();
        for (const path of paths)
          for (const profile of profiles) {
            budget.charge('score');
            const rotation = /^[xyz]/.test(move);
            const hands = rotation
              ? path.grip === profile.entryGrip
                ? []
                : undefined
              : handling.get(path.grip)?.get(profile.entryGrip);
            if (!hands) continue;
            const extra = [...hands, ...profile.events].map((ev) => ({
              ...ev,
              boundary,
              profileId: blocks ? ev.profileId : `position/${ev.profileId}`,
            }));
            const score: Rated = { ...path.score, events: [...path.score.events, ...extra] };
            if (blocks)
              for (const ev of extra) {
                if (ev.kind === 'turn') score.T++;
                if (ev.kind === 'rotation') score.R++;
                if (ev.kind === 'regrip') score.G++;
                if (ev.kind === 'awkward') score.A++;
              }
            score.cost = score.T + 2 * (score.R + score.G + score.V + score.A);
            const candidate = { grip: profile.exitGrip, score },
              prior = next.get(candidate.grip);
            if (!prior || rank(candidate, prior) < 0) next.set(candidate.grip, candidate);
          }
        paths = [...next.values()].sort(rank);
        boundary++;
        if (!paths.length)
          return { rated: false, reason: 'No feasible grip continuation in the admitted model.' };
      }
    }
    return paths.sort(rank)[0].score;
  } catch (error) {
    if (error instanceof RouxBudgetStop) throw error;
    return {
      rated: false,
      reason: error instanceof Error ? error.message : 'Invalid execution profile.',
    };
  }
}
/** Preserve actual turns and final hold. Camera movement never enters this function. */
export function improveBlockExecution(
  engine: CubeEngine,
  segments: readonly RouxExecutionSegment[],
  frame: RouxFrame,
  catalog: RouxExecutionCatalog,
  budget: RouxSearchBudget,
  allow: (segment: RouxExecutionSegment, index: number) => boolean = () => true,
): { segments: readonly RouxExecutionSegment[]; score: RouxExecutionScore } {
  const e = meterRouxEngine(engine, budget);
  let best = { segments, score: scoreRouxExecution(e, segments, frame, catalog, budget) };
  if (!best.score.rated) return best;
  const solved = e.solved(),
    mapping = new Map<string, TeachingMove>();
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    if (
      !allow(s, i) ||
      s.phase !== 'blocks' ||
      s.moves.length < 3 ||
      s.moves.some((m) => /^[xyz]/.test(m))
    )
      continue;
    for (const turn of ['y', 'y2', "y'"] as TeachingMove[]) {
      const undo = invertTeachingMoves([turn]),
        inner: TeachingMove[] = [];
      for (const move of s.moves) {
        const key = `${turn}/${move}`;
        let mapped = mapping.get(key);
        if (!mapped) {
          const want = e.apply(solved, [move]);
          mapped = STM_MOVES.find((candidate) =>
            e.equals(e.apply(solved, [turn, candidate, ...undo]), want),
          );
          if (!mapped) throw Error('No physical conjugate for execution variant.');
          mapping.set(key, mapped);
        }
        inner.push(mapped);
      }
      const held = e.apply(s.before, [turn]),
        after = e.apply(held, inner);
      if (!e.equals(e.apply(after, undo), e.apply(s.before, s.moves)))
        throw Error('Execution variant changed the physical endpoint.');
      const replacement: RouxExecutionSegment[] = [
        { before: s.before, moves: [turn], phase: 'blocks', targets: [] },
        { before: held, moves: inner, phase: 'blocks', targets: s.targets },
        { before: after, moves: undo, phase: 'blocks', targets: [] },
      ];
      const candidate = [...segments.slice(0, i), ...replacement, ...segments.slice(i + 1)],
        score = scoreRouxExecution(e, candidate, frame, catalog, budget);
      if (score.rated && best.score.rated && score.cost < best.score.cost)
        best = { segments: candidate, score };
    }
  }
  return best;
}
