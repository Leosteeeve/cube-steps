import { isTeachingMove } from '../../../core/teaching-moves';
import { TEACHING_WORK, drainTeachingSteps, type TeachingWork } from '../../shared/work';
import type { TeachingMove } from '../../../core/types';
import type { RouxSearchBudget } from '../types';
import type { RouxExecutionCatalog, RouxExecutionProfile, RouxGrip } from './types';
const id = (l: number, r: number) => `l${l}r${r}`;
const pose = (s: string) => {
  const m = /^l(-1|0|1)r(-1|0|1)$/.exec(s);
  if (!m) throw Error('Unknown physical grip.');
  return { l: Number(m[1]), r: Number(m[2]) };
};
const rotation = (m: string) => /^[xyz]/.test(m);
/** Symbolic wrist/finger feasibility, not a timing prediction. */
function transition(move: TeachingMove, from: string, to: string) {
  const a = pose(from),
    b = pose(to),
    face = move[0],
    prime = move.endsWith("'"),
    half = move.endsWith('2');
  if (rotation(move))
    return to === id(0, 0)
      ? {
          awkward: false,
          instruction: `Turn the whole cube ${move}, then settle into the neutral hold. This includes the handling.`,
        }
      : null;
  if (face === 'R' || face === 'L') {
    const side = face === 'R' ? 'r' : 'l',
      support = face === 'R' ? 'l' : 'r',
      delta = b[side] - a[side];
    if (a[support] !== b[support] || (half ? Math.abs(delta) !== 2 : delta !== (prime ? -1 : 1)))
      return null;
    return {
      awkward: false,
      instruction: `Turn ${move} with the ${side === 'r' ? 'right' : 'left'} wrist; the other hand supports the cube.`,
    };
  }
  if (from !== to) return null;
  if (face === 'U') {
    if (prime ? a.l > 0 : a.r < 0) return null;
    return {
      awkward: false,
      instruction: `Use the ${prime ? 'left' : 'right'} index ${half ? 'and middle fingers' : 'finger'} for ${move}; maintain the support hold.`,
    };
  }
  if (face === 'M') {
    if (a.l !== 0 || a.r < 0) return null;
    return {
      awkward: false,
      instruction: `Flick ${move} with the left ring ${half ? 'and middle fingers' : 'finger'}, keeping both outer layers supported.`,
    };
  }
  if (face === 'D') {
    if (a.l !== 0) return null;
    return {
      awkward: half,
      instruction: `Use the left ring finger ${half ? 'twice ' : ''}for ${move}; keep the upper grip steady.`,
    };
  }
  if (face === 'F' || face === 'B') {
    if ((prime ? a.l : a.r) !== 0) return null;
    return {
      awkward: face === 'B',
      instruction: `Use the ${prime ? 'left' : 'right'} hand for ${move}${face === 'B' ? ', reaching the rear layer' : ', pushing or pulling the front layer'}.`,
    };
  }
  if (a.l !== 0 || a.r !== 0) return null;
  return {
    awkward: true,
    instruction: `Support the outer layers and move the ${face} slice for ${move}; this model marks the sideways slice action as awkward.`,
  };
}
const sources = [
  'docs/research/roux-execution-v1.md',
  'https://tutorial.rouxers.com/intermediate/second-block.html',
];
const grips: RouxGrip[] = [];
for (const l of [-1, 0, 1])
  for (const r of [-1, 0, 1])
    grips.push({
      id: id(l, r),
      description: `Left wrist ${l}, right wrist ${r}; 0 is neutral and ±1 is a quarter-turn wrist offset.`,
    });
const profiles: RouxExecutionProfile[] = [];
for (const from of grips)
  for (const to of grips) {
    const a = pose(from.id),
      b = pose(to.id);
    if (Number(a.l !== b.l) + Number(a.r !== b.r) === 1) {
      const name = `regrip/${from.id}/${to.id}`;
      profiles.push({
        id: name,
        moves: [],
        entryGrip: from.id,
        exitGrip: to.id,
        sourceRefs: sources,
        rationale:
          'One supporting hand remains in place while the other repositions; no layer turns.',
        events: [
          {
            boundary: 0,
            kind: 'regrip',
            profileId: name,
            fromGrip: from.id,
            toGrip: to.id,
            instruction: `Reposition the ${a.l !== b.l ? 'left' : 'right'} hand to ${to.id}; keep the other hand supporting the cube.`,
          },
        ],
      });
    }
    for (const base of [
      'U',
      'D',
      'L',
      'R',
      'F',
      'B',
      'M',
      'E',
      'S',
      'Uw',
      'Dw',
      'Lw',
      'Rw',
      'Fw',
      'Bw',
      'x',
      'y',
      'z',
    ])
      for (const suffix of ['', "'", '2']) {
        const move = (base + suffix) as TeachingMove,
          detail = transition(move, from.id, to.id);
        if (!detail) continue;
        const name = `token/${move}/${from.id}/${to.id}`;
        const event = {
          boundary: 0,
          kind: rotation(move) ? ('rotation' as const) : ('turn' as const),
          profileId: name,
          fromGrip: from.id,
          toGrip: to.id,
          instruction: detail.instruction,
        };
        profiles.push({
          id: name,
          moves: [move],
          entryGrip: from.id,
          exitGrip: to.id,
          sourceRefs: sources,
          rationale:
            'CubeSteps authored common right-leading two-handed handling model; physical calibration pending.',
          events: detail.awkward ? [event, { ...event, kind: 'awkward' }] : [event],
        });
      }
  }
export const ROUX_EXECUTION_CATALOG: RouxExecutionCatalog = {
  version: 'roux-execution-v1',
  neutralGrip: id(0, 0),
  grips,
  profiles,
};
export function* validateRouxExecutionCatalogSteps(
  c: RouxExecutionCatalog,
  budget: RouxSearchBudget,
): Generator<TeachingWork, void> {
  if (c.version !== 'roux-execution-v1' || c.neutralGrip !== id(0, 0))
    throw Error('Unknown execution model.');
  const known = new Set<string>(),
    names = new Set<string>();
  for (const g of c.grips) {
    budget.charge('score');
    pose(g.id);
    if (known.has(g.id) || !g.description) throw Error('Invalid grip.');
    known.add(g.id);
    yield TEACHING_WORK;
  }
  if (!known.has(c.neutralGrip)) throw Error('Missing neutral grip.');
  for (const p of c.profiles) {
    budget.charge('score');
    if (
      !p.id ||
      names.has(p.id) ||
      !known.has(p.entryGrip) ||
      !known.has(p.exitGrip) ||
      !p.rationale ||
      !p.sourceRefs.length ||
      p.sourceRefs.some((s) => !s)
    )
      throw Error('Invalid profile or grip.');
    names.add(p.id);
    // v1 deliberately composes admitted primitive profiles; it does not infer
    // formula-specific finger tricks from an algorithm's name.
    if (p.moves.length > 1 || p.moves.some((m) => !isTeachingMove(m)))
      throw Error('Unsupported execution profile.');
    const a = pose(p.entryGrip),
      b = pose(p.exitGrip),
      move = p.moves[0],
      detail = move ? transition(move, p.entryGrip, p.exitGrip) : null;
    const kinds = move
      ? [rotation(move) ? 'rotation' : 'turn', ...(detail?.awkward ? ['awkward'] : [])]
      : ['regrip'];
    if (move ? !detail : Number(a.l !== b.l) + Number(a.r !== b.r) !== 1)
      throw Error('Impossible physical grip transition.');
    if (
      p.events.length !== kinds.length ||
      p.events.some(
        (ev, i) =>
          ev.boundary !== 0 ||
          ev.kind !== kinds[i] ||
          ev.profileId !== p.id ||
          ev.fromGrip !== p.entryGrip ||
          ev.toGrip !== p.exitGrip ||
          !ev.instruction,
      )
    )
      throw Error('Invalid profile event boundary or transition.');
    yield TEACHING_WORK;
  }
}
export function validateRouxExecutionCatalog(
  ...args: Parameters<typeof validateRouxExecutionCatalogSteps>
): void {
  return drainTeachingSteps(validateRouxExecutionCatalogSteps(...args));
}
