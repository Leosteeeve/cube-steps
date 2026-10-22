import type { CubeEngine, CubeState, TeachingMove } from '../../../core/types';
import type { TeachingAlgorithm } from '../../contracts';
import { invertTeachingMoves } from '../../../core/teaching-moves';
import { sameRouxPiece } from '../predicates';
import { rouxReferenceState } from '../frame';
import { encodeLse, type LseCoordinate } from './coordinates';
import { createLseModel, type LseGoal, type LseModel } from './model';
type Family = 'upper' | 'reference' | 'half' | 'arrow' | 'transport';
export interface LseManeuver {
  id: string;
  name: string;
  moves: TeachingMove[];
  kind: 'setup' | 'algorithm';
  family: Family;
  algorithmId?: string;
  match(
    engine: CubeEngine,
    state: CubeState,
    goal: LseGoal,
  ): { caseId: string; targets: string[]; recognition: string; explanation: string } | null;
  check(engine: CubeEngine, before: CubeState, after: CubeState, goal: LseGoal): boolean;
}
const definitions: [string, string, Family, string][] = [
  ['u', 'Upper-layer setup', 'upper', 'U'],
  ['up', 'Upper-layer setup inverse', 'upper', "U'"],
  ['u2', 'Upper-layer half turn', 'upper', 'U2'],
  ['m', 'Reference-center setup', 'reference', 'M'],
  ['mp', 'Reference-center setup inverse', 'reference', "M'"],
  ['m2', 'Middle-slice half turn', 'half', 'M2'],
  ['front-arrow', 'Front arrow maneuver', 'arrow', "M' U M"],
  ['front-arrow-inverse', 'Front arrow inverse', 'arrow', "M' U' M"],
  ['back-arrow', 'Back arrow maneuver', 'arrow', "M U' M'"],
  ['back-arrow-inverse', 'Back arrow inverse', 'arrow', "M U M'"],
  ['front-transport', 'Front transport', 'transport', "M' U2 M"],
  ['back-transport', 'Back transport', 'transport', "M U2 M'"],
  ['front-through', 'Front transport with center half turn', 'transport', "M' U2 M'"],
  ['back-through', 'Back transport with center half turn', 'transport', 'M U2 M'],
];
export function admitLseManeuver(
  model: LseModel,
  before: LseCoordinate,
  after: LseCoordinate,
  m: LseManeuver,
  goal: LseGoal,
): boolean {
  if (goal === 'orientation') {
    if (before.phase % 2) return m.family === 'reference' && after.phase % 2 === 0;
    return m.family !== 'reference' && m.family !== 'transport' && after.phase % 2 === 0;
  }
  if (!model.goal(before, 'orientation') || !model.goal(after, 'orientation')) return false;
  if (m.family === 'arrow' || m.family === 'reference') return false;
  return (
    goal === 'left-right' || (model.goal(before, 'left-right') && model.goal(after, 'left-right'))
  );
}
export const ROUX_LSE_MANEUVERS: readonly LseManeuver[] = definitions.map(
  ([key, name, family, text]) => {
    const moves = text.split(' ') as TeachingMove[],
      id = 'roux-lse-' + key,
      kind = moves.length === 1 ? 'setup' : 'algorithm';
    const m: LseManeuver = {
      id,
      name,
      family,
      moves,
      kind,
      ...(kind === 'algorithm' ? { algorithmId: id } : {}),
      match(engine, state, goal) {
        const before = encodeLse(engine, state);
        if (!before) return null;
        const model = createLseModel(engine),
          after = model.step(before, moves);
        if (!admitLseManeuver(model, before, after, m, goal)) return null;
        const result = engine.apply(state, moves),
          a = engine.observe(state),
          b = engine.observe(result);
        const all = [...a.edges, ...a.corners],
          next = [...b.edges, ...b.corners];
        const affected = all.filter(
          (p) =>
            !sameRouxPiece(
              p,
              next.find((q) => q.id === p.id)!,
            ),
        );
        const bad = model.badSlots(before),
          then = model.badSlots(after),
          slots = ['UF', 'UR', 'UB', 'UL', 'DF', 'DB'];
        let prepared = false;
        if (family === 'arrow') {
          const expected = encodeLse(
            engine,
            engine.apply(rouxReferenceState(engine), [
              ...Array(before.phase).fill('M'),
              ...invertTeachingMoves(moves),
            ]),
          )!;
          prepared = JSON.stringify(bad) === JSON.stringify(model.badSlots(expected));
        }
        const caseName =
          family === 'arrow' ? (prepared ? 'prepared-arrow' : 'orientation-setup') : family;
        const reference =
          bad === null
            ? 'The U center is not white or yellow; establish the edge-orientation reference first.'
            : `Bad edges are at ${bad.map((i) => slots[i]).join(', ') || 'none'}.`;
        const effect = affected
          .map(
            (p) =>
              `${Object.values(p.stickers).sort().join('-')} ${p.slot} → ${next.find((q) => q.id === p.id)!.slot}`,
          )
          .join('; ');
        const purpose =
          family === 'reference'
            ? 'Move a white or yellow center to U. The side blocks stay fixed.'
            : family === 'arrow'
              ? prepared
                ? 'The prepared arrow matches this hold. Open the middle slice, turn U as shown, and close the slice.'
                : 'Rearrange this orientation pattern with the shown open-turn-close maneuver to prepare a later arrow.'
              : family === 'transport'
                ? 'Open the middle slice, turn the upper layer halfway, then move the slice as shown. This transports several edges; it is not a two-edge swap.'
                : family === 'upper'
                  ? 'Move the top edges and corner ring together into the next execution hold.'
                  : 'Move the four middle-slice edges halfway around while keeping the corner ring still.';
        const outcome =
          then === null
            ? 'The middle-slice reference is in progress.'
            : `At the checkpoint, ${then.length} edges need orientation${bad && then.length > bad.length ? ' (temporarily more; this prepares a later case)' : ''}.`;
        return {
          caseId:
            id +
            ':' +
            caseName +
            ':' +
            before.phase +
            ':' +
            before.offset +
            ':' +
            (bad?.join('-') ?? 'setup'),
          targets: affected.map((p) => p.id),
          recognition: `${reference} The corner ring has U offset ${before.offset}.`,
          explanation: `${purpose} ${effect}. ${outcome} Keep blue left and green right.`,
        };
      },
      check(engine, before, after, goal) {
        const a = encodeLse(engine, before),
          b = encodeLse(engine, after);
        return (
          !!a &&
          !!b &&
          admitLseManeuver(createLseModel(engine), a, b, m, goal) &&
          engine.equals(engine.apply(before, moves), after)
        );
      },
    };
    return m;
  },
);
export const ROUX_LSE_ALGORITHMS: Readonly<Record<string, TeachingAlgorithm>> = Object.fromEntries(
  ROUX_LSE_MANEUVERS.filter((m) => m.kind === 'algorithm').map((m) => [
    m.id,
    {
      name: m.name,
      moves: m.moves,
      precondition:
        'Both blocks and the corner ring are complete. Use the displayed edge pattern and U hold.',
      effect:
        'Transport or reorient the highlighted pieces while restoring the declared checkpoint.',
      segments: [
        { label: 'Open', start: 0, end: 1 },
        { label: 'Upper turn', start: 1, end: 2 },
        { label: 'Close or continue', start: 2, end: 3 },
      ],
    },
  ]),
);
export function lseCatalogDigest(): string {
  const text = JSON.stringify(ROUX_LSE_MANEUVERS.map((m) => [m.id, m.moves, m.family]));
  let hash = 2166136261;
  for (const c of text) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
}
