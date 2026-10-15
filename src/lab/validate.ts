import type { CubeEngine, CubeState, TeachingMove } from '../core/types';
import { isTeachingMove } from '../core/teaching-moves';
import { ALGORITHM_REGISTRY } from '../algorithms/registry';
import { f2lSignature } from '../methods/advanced/f2l/recognize';
import { observeF2LPairs } from '../methods/cfop/f2l-cases';
import { whiteCrossSolved } from '../methods/shared/pieces';
import { recognizeAdvancedOLL } from '../methods/advanced/recognize-oll';
import { recognizeAdvancedPLL } from '../methods/advanced/recognize-pll';
import type { F2LTarget } from '../methods/advanced/f2l/types';
import { createLabFrameSteps } from './frames';
import { crossMinimum } from './cross';
import { completedPhysicalPairs } from './f2l/candidates';
import { scoreExecution } from './execution/score';
import type { ExecutionSegment } from './execution/types';
import { fingerprintLabState, freezeLabValue, prepareLabInputSteps } from './input';
import {
  LabStopped,
  createLabBudget,
  LAB_WORK,
  meterLabEngine,
  type LabBudget,
  type LabWork,
} from './budget';
import {
  drainLabSteps,
  formulaSnapshot,
  labStageComplete,
  LAB_SECTIONS,
  LAB_SEARCH_VERSION,
  LAB_CATALOG_VERSION,
  labRouteId,
  type LabContext,
} from './finalize';
import type { LabAction, LabInput, LabRoute, LabSectionId } from './types';

const verified = Symbol('physically verified Lab route');
const admitted = new WeakSet<object>();
export function isVerifiedLabRoute(value: unknown): value is VerifiedLabRoute {
  return typeof value === 'object' && value !== null && admitted.has(value);
}
export interface VerifiedLabRoute {
  readonly route: LabRoute;
  readonly validationMode: 'current' | 'archive';
  readonly [verified]: true;
}
export class LabValidationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly actionId?: string,
  ) {
    super(message);
    this.name = 'LabValidationError';
  }
}
function requireThat(condition: unknown, code: string, message: string): asserts condition {
  if (!condition) throw new LabValidationError(code, message);
}
const text = (v: unknown, max = 2000): v is string =>
  typeof v === 'string' && v.length > 0 && v.length <= max;
function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, normalize(v)]),
    );
  return value;
}
const same = (a: unknown, b: unknown) =>
  JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));
function sameState(a: CubeState, b: unknown): boolean {
  try {
    return fingerprintLabState(a) === fingerprintLabState(b as CubeState);
  } catch {
    return false;
  }
}
const moves = (value: unknown, max = 512): value is TeachingMove[] =>
  Array.isArray(value) && value.length <= max && value.every(isTeachingMove);
function shape(raw: unknown): asserts raw is LabRoute {
  requireThat(raw && typeof raw === 'object', 'shape', 'Missing Lab route.');
  const r = raw as LabRoute;
  requireThat(
    r.kind === 'cfop-lab' &&
      r.schemaVersion === 1 &&
      text(r.id, 120) &&
      text(r.inputFingerprint, 4096),
    'schema',
    'Unsupported Lab route schema.',
  );
  requireThat(
    Array.isArray(r.actions) &&
      r.actions.length <= 128 &&
      Array.isArray(r.skips) &&
      r.skips.length <= 6,
    'bounds',
    'Invalid action/skip bounds.',
  );
  requireThat(
    moves(r.setupMoves) &&
      moves(r.positioningMoves, 4) &&
      r.boundaries &&
      Object.values(r.boundaries).length === 3 &&
      Object.values(r.boundaries).every((n) => Number.isSafeInteger(n) && n >= 0 && n <= 512),
    'bounds',
    'Invalid setup or boundaries.',
  );
  requireThat(
    Number.isSafeInteger(r.crossMinimum) &&
      r.crossMinimum >= 0 &&
      r.crossMinimum <= 8 &&
      Number.isSafeInteger(r.crossLength) &&
      r.crossLength >= r.crossMinimum &&
      r.crossLength <= r.crossMinimum + 2,
    'cross',
    'Cross length exceeds the permitted minimum + 2.',
  );
  requireThat(
    r.startHold &&
      r.endHold &&
      text(r.neutralGrip, 60) &&
      text(r.modelVersion, 120) &&
      text(r.searchVersion, 120) &&
      text(r.catalogVersion, 120),
    'shape',
    'Missing route versions or holds.',
  );
  requireThat(
    r.formulas &&
      typeof r.formulas === 'object' &&
      !Array.isArray(r.formulas) &&
      Object.keys(r.formulas).length <= 128,
    'formula',
    'Invalid formula dictionary.',
  );
  let count = 0;
  for (const a of r.actions) {
    requireThat(
      a &&
        text(a.id, 120) &&
        LAB_SECTIONS.includes(a.section) &&
        ['setup', 'algorithm', 'rotation'].includes(a.kind) &&
        text(a.ruleId, 120) &&
        text(a.caseId, 120) &&
        text(a.recognition, 5000) &&
        text(a.explanation, 5000) &&
        moves(a.moves) &&
        a.moves.length > 0,
      'action',
      'Invalid action metadata or empty phantom action.',
    );
    count += a.moves.length;
    requireThat(
      Array.isArray(a.targets) &&
        a.targets.length <= 20 &&
        a.targets.every((x: unknown) => text(x, 3)) &&
        a.checkpoint &&
        text(a.checkpoint.description, 5000) &&
        Array.isArray(a.checkpoint.targets) &&
        a.checkpoint.targets.length <= 20 &&
        Array.isArray(a.checkpoint.protectedIds) &&
        a.checkpoint.protectedIds.length <= 4,
      'checkpoint',
      'Invalid target/checkpoint shape.',
    );
    if (a.algorithmId)
      requireThat(
        Object.hasOwn(r.formulas, a.algorithmId),
        'formula',
        'A referenced formula definition is missing.',
      );
  }
  requireThat(count <= 512, 'bounds', 'Route exceeds 512 teaching tokens.');
  for (const [id, f] of Object.entries(r.formulas)) {
    requireThat(
      text(id, 120) &&
        f.id === id &&
        text(f.caseId, 120) &&
        text(f.name, 300) &&
        text(f.precondition, 5000) &&
        text(f.effect, 5000) &&
        moves(f.moves) &&
        f.moves.length > 0 &&
        Array.isArray(f.sourceRefs) &&
        f.sourceRefs.length <= 16,
      'formula',
      'Invalid archived formula definition.',
    );
    for (const ref of f.sourceRefs)
      requireThat(
        text(ref.title, 500) &&
          text(ref.reference, 1000) &&
          text(ref.url, 2048) &&
          /^https:\/\//.test(ref.url),
        'formula',
        'Invalid formula source reference.',
      );
    if (f.segments)
      requireThat(
        Array.isArray(f.segments) &&
          f.segments.length <= 64 &&
          f.segments.every(
            (s) =>
              text(s.label, 300) &&
              Number.isSafeInteger(s.start) &&
              Number.isSafeInteger(s.end) &&
              s.start >= 0 &&
              s.end > s.start &&
              s.end <= f.moves.length,
          ),
        'formula',
        'Invalid formula segments.',
      );
  }
  requireThat(r.score && typeof r.score.rated === 'boolean', 'score', 'Missing score.');
  if (r.score.rated) {
    requireThat(
      text(r.score.modelVersion, 120) &&
        [r.score.T, r.score.R, r.score.G, r.score.V, r.score.A, r.score.cost].every(
          (n) => Number.isSafeInteger(n) && n >= 0 && n <= 100_000,
        ) &&
        Array.isArray(r.score.events) &&
        r.score.events.length <= 4096,
      'score',
      'Invalid score bounds.',
    );
    for (const e of r.score.events)
      requireThat(
        Number.isSafeInteger(e.boundary) &&
          e.boundary >= 0 &&
          e.boundary <= 512 &&
          Number.isSafeInteger(e.count) &&
          e.count > 0 &&
          e.count <= 2 &&
          ['turn', 'rotation', 'hand-regrip', 'visibility', 'awkward'].includes(e.kind) &&
          text(e.profileId, 160) &&
          text(e.fromGrip, 60) &&
          text(e.toGrip, 60) &&
          text(e.rationale, 2000),
        'score',
        'Invalid execution event.',
      );
  } else requireThat(text(r.score.reason, 1000), 'score', 'Missing unrated reason.');
}
export function validateLabRoute(
  context: LabContext,
  input: LabInput,
  raw: unknown,
  mode: 'current' | 'archive',
): VerifiedLabRoute {
  return drainLabSteps(validateLabRouteSteps(context, input, raw, mode, createLabBudget()));
}
export function* validateLabRouteSteps(
  context: LabContext,
  input: LabInput,
  raw: unknown,
  mode: 'current' | 'archive',
  budget: LabBudget,
): Generator<LabWork, VerifiedLabRoute> {
  try {
    return yield* replayLabRouteSteps(context, input, raw, mode, budget);
  } catch (error) {
    if (error instanceof LabStopped || error instanceof LabValidationError) throw error;
    throw new LabValidationError(
      'malformed',
      error instanceof Error ? error.message : 'Malformed Lab route.',
    );
  }
}
function* replayLabRouteSteps(
  context: LabContext,
  input: LabInput,
  raw: unknown,
  mode: 'current' | 'archive',
  budget: LabBudget,
): Generator<LabWork, VerifiedLabRoute> {
  budget.checkpoint();
  shape(raw);
  const route = raw,
    engine = meterLabEngine(context.engine, budget);
  const actual = (yield* prepareLabInputSteps(engine, input.input, budget)).initial;
  requireThat(
    sameState(actual, input.initial) &&
      fingerprintLabState(actual) === input.fingerprint &&
      route.inputFingerprint === input.fingerprint &&
      same(route.input, input.input) &&
      sameState(actual, route.initial),
    'input',
    'Original input or fingerprint does not match.',
  );
  if (mode === 'current')
    requireThat(
      route.modelVersion === context.profiles.version &&
        route.catalogVersion === LAB_CATALOG_VERSION &&
        route.searchVersion === LAB_SEARCH_VERSION &&
        route.neutralGrip === context.profiles.neutralGrip,
      'version',
      'This route is not a current-model recommendation.',
    );
  const frame = yield* createLabFrameSteps(engine, input, route.startHold, budget);
  requireThat(
    same(route.positioningMoves, frame.positioningMoves),
    'hold',
    'Initial positioning does not match the selected hold.',
  );
  requireThat(
    crossMinimum(engine, input, frame, context.table) === route.crossMinimum,
    'cross',
    'The exact cross minimum is incorrect.',
  );
  yield LAB_WORK;
  let state = actual,
    boundary = 0,
    crossStart = 0,
    crossEnd = 0,
    f2lEnd = 0;
  let protectedIds: readonly string[] = [];
  const segments: ExecutionSegment[] = [],
    usedFormulas = new Set<string>(),
    ids = new Set<string>();
  let prior = -1;
  for (const a of route.actions) {
    const index = LAB_SECTIONS.indexOf(a.section);
    requireThat(
      index >= prior && !ids.has(a.id),
      'order',
      'Duplicate actions or out-of-order stages.',
    );
    prior = index;
    ids.add(a.id);
  }
  for (const section of LAB_SECTIONS) {
    const group = route.actions.filter((a) => a.section === section),
      skips = route.skips.filter((s) => s.section === section);
    requireThat(
      group.length ? skips.length === 0 : skips.length === 1 && text(skips[0].reason, 1000),
      'skip',
      'Every empty section must have one explicit skip explanation.',
    );
    if (section === 'lab-cross') crossStart = boundary;
    if (section === 'lab-f2l')
      protectedIds = completedPhysicalPairs(engine, frame.toCanonical(state), frame);
    if (!group.length)
      requireThat(
        labStageComplete(engine, frame.toCanonical(state), section),
        'skip',
        'An unfinished stage was marked skipped.',
      );
    if (mode === 'current' && group.length && ['lab-oll', 'lab-pll'].includes(section))
      requireThat(
        group.filter((a) => a.kind === 'algorithm').length === 1,
        'formula',
        'Last-layer stage needs one recognized formula.',
      );
    for (const action of group) {
      budget.charge('expand');
      yield LAB_WORK;
      requireThat(
        sameState(state, action.before),
        'state',
        'Recorded action start does not match physical replay.',
      );
      const canonicalBefore = frame.toCanonical(state),
        observation = engine.observe(state);
      const pair =
        section === 'lab-f2l'
          ? observeF2LPairs(engine, canonicalBefore).find(
              (p) => frame.physicalPieceId(p.cornerId) === action.targets[0],
            )
          : undefined;
      if (section === 'lab-f2l') {
        requireThat(
          pair &&
            !pair.solved &&
            same(action.targets, [
              frame.physicalPieceId(pair.cornerId),
              frame.physicalPieceId(pair.edgeId),
            ]),
          'target',
          'F2L targets are not one unsolved physical pair.',
        );
        requireThat(
          action.pair &&
            action.pair.cornerId === action.targets[0] &&
            action.pair.edgeId === action.targets[1] &&
            action.pair.slot === pair.slot &&
            action.pair.solvedBefore === protectedIds.length &&
            action.pair.ordinal === protectedIds.length + 1,
          'target',
          'F2L pair annotations do not match recognition.',
        );
        requireThat(
          same(action.checkpoint.protectedIds, protectedIds),
          'checkpoint',
          'The protected-pair set was changed.',
        );
      } else
        requireThat(
          action.checkpoint.protectedIds.length === 0,
          'checkpoint',
          'Unexpected protected-pair annotation.',
        );
      if (action.algorithmId) {
        const formula = route.formulas[action.algorithmId];
        usedFormulas.add(action.algorithmId);
        requireThat(
          action.kind === 'algorithm' && same(action.moves, formula.moves),
          'formula',
          'Formula boundaries or tokens were altered.',
        );
        if (mode === 'current')
          requireThat(
            same(formula, formulaSnapshot(action.algorithmId)),
            'formula',
            'Formula definition differs from the active catalog.',
          );
      } else
        requireThat(
          action.kind !== 'algorithm',
          'formula',
          'Algorithm action is missing its definition.',
        );
      if (mode === 'current')
        checkCurrentAction(engine, action, canonicalBefore, pair as F2LTarget | undefined);
      for (const move of action.moves) {
        state = engine.apply(state, [move]);
        boundary++;
        yield LAB_WORK;
      }
      requireThat(
        sameState(state, action.after),
        'state',
        'Recorded action endpoint does not match physical replay.',
      );
      const canonicalAfter = frame.toCanonical(state),
        afterO = engine.observe(state);
      requireThat(
        action.checkpoint.hold &&
          same(action.checkpoint.hold, { bottom: afterO.centers.D, front: afterO.centers.F }),
        'hold',
        'Recorded physical hold is incorrect.',
      );
      const completed = completedPhysicalPairs(engine, canonicalAfter, frame);
      requireThat(
        protectedIds.every((id) => completed.includes(id)) || section !== 'lab-f2l',
        'checkpoint',
        'A previously completed pair was not restored.',
      );
      const predicate = action.checkpoint.predicate;
      const valid =
        predicate === 'position'
          ? section === 'lab-position'
          : predicate === 'cross-progress'
            ? section === 'lab-cross'
            : predicate === 'cross'
              ? whiteCrossSolved(engine, canonicalAfter)
              : predicate === 'pair'
                ? section === 'lab-f2l' &&
                  completed.includes(action.targets[0]) &&
                  completed.length > protectedIds.length
                : predicate === 'f2l'
                  ? labStageComplete(engine, canonicalAfter, 'lab-f2l')
                  : predicate === 'oll'
                    ? labStageComplete(engine, canonicalAfter, 'lab-oll')
                    : predicate === 'pll'
                      ? labStageComplete(engine, canonicalAfter, 'lab-pll')
                      : predicate === 'solved'
                        ? engine.isSolved(state)
                        : false;
      requireThat(valid, 'checkpoint', 'A recorded checkpoint is not physically true.');
      requireThat(
        same(action.checkpoint.targets, predicate === 'pair' ? action.targets : []),
        'checkpoint',
        'Checkpoint targets were altered.',
      );
      if (section === 'lab-f2l') {
        requireThat(
          action.pair!.solvedAfter === completed.length,
          'checkpoint',
          'Completed-pair count is incorrect.',
        );
        const formula = action.algorithmId
          ? context.profiles.formulas[action.algorithmId]
          : undefined;
        segments.push({
          phase: 'f2l',
          moves: action.moves,
          algorithmId: action.algorithmId,
          recognition: formula
            ? {
                observation,
                target: {
                  cornerId: action.targets[0],
                  edgeId: action.targets[1],
                  slot: pair!.slot as F2LTarget['slot'],
                },
                bottomColor: frame.hold.bottom,
                mode: formula.recognition,
              }
            : undefined,
        });
        if (predicate === 'pair') protectedIds = completed;
      } else if (section === 'lab-cross') segments.push({ phase: 'cross', moves: action.moves });
      if (section === 'lab-position')
        requireThat(
          same(action.moves, route.positioningMoves) && action.targets.length === 0,
          'position',
          'Initial positioning was repeated or changed.',
        );
      else if (section === 'lab-cross') {
        const expected = observation.edges
          .filter((p) => Object.values(p.stickers).includes(frame.hold.bottom))
          .map((p) => p.id);
        requireThat(
          same(action.targets, expected),
          'target',
          'Cross action does not highlight the selected physical edges.',
        );
      } else if (section !== 'lab-f2l') {
        const expected = [...observation.edges, ...observation.corners]
          .filter((p) => Object.values(p.stickers).includes(observation.centers.U))
          .map((p) => p.id);
        requireThat(
          same(action.targets, expected),
          'target',
          'Last-layer targets are not the actual top-color pieces.',
        );
      }
    }
    requireThat(
      labStageComplete(engine, frame.toCanonical(state), section),
      'stage',
      'A stage endpoint is incomplete.',
    );
    if (section === 'lab-position')
      requireThat(
        same(engine.observe(state).centers.D, route.startHold.bottom) &&
          same(engine.observe(state).centers.F, route.startHold.front) &&
          group.length <= 1,
        'hold',
        'Starting hold is incorrect.',
      );
    if (section === 'lab-cross') {
      crossEnd = boundary;
      requireThat(
        crossEnd - crossStart === route.crossLength,
        'cross',
        'Cross token count is incorrect.',
      );
    }
    if (section === 'lab-f2l') f2lEnd = boundary;
  }
  requireThat(
    route.skips.every((s) => LAB_SECTIONS.includes(s.section)) &&
      usedFormulas.size === Object.keys(route.formulas).length,
    'formula',
    'Unused definitions or unknown skipped stages.',
  );
  requireThat(
    same(route.boundaries, { crossStart, crossEnd, f2lEnd }) &&
      sameState(state, route.final) &&
      engine.isSolved(state),
    'endpoint',
    'Final state or objective boundaries are incorrect.',
  );
  const end = engine.observe(state).centers;
  requireThat(
    same(route.endHold, { bottom: end.D, front: end.F }),
    'hold',
    'Final hold is incorrect.',
  );
  let setup = engine.solved();
  for (const move of route.setupMoves) {
    setup = engine.apply(setup, [move]);
    yield LAB_WORK;
  }
  requireThat(
    sameState(setup, actual),
    'setup',
    'Setup does not reconstruct the original physical input.',
  );
  if (mode === 'current') {
    let expected: LabRoute['score'] | undefined;
    for (const event of scoreExecution(segments, context.profiles, budget)) {
      if (event.kind === 'work') yield event;
      else
        expected = event.paths[0]?.score ?? {
          rated: false,
          reason: event.unratedReason ?? 'No admitted continuous grip path.',
        };
    }
    requireThat(
      same(route.score, expected),
      'score',
      'Execution score or instructions cannot be reproduced from neutral grip.',
    );
    requireThat(
      route.id === labRouteId(input.fingerprint, route.actions),
      'id',
      'Route identity does not match its contents.',
    );
  }
  const result = Object.freeze({
    route: freezeLabValue(structuredClone(route)),
    validationMode: mode,
    [verified]: true as const,
  });
  admitted.add(result);
  return result;
}

function checkCurrentAction(engine: CubeEngine, a: LabAction, before: CubeState, pair?: F2LTarget) {
  const predicate = a.checkpoint.predicate;
  if (a.section === 'lab-position')
    requireThat(
      a.ruleId === 'lab-position' &&
        a.kind === 'rotation' &&
        a.moves.every((m) => /^[xyz]/.test(m)) &&
        predicate === 'position',
      'position',
      'Invalid positioning action.',
    );
  else if (a.section === 'lab-cross')
    requireThat(
      a.ruleId === 'lab-cross-turn' &&
        a.kind === 'setup' &&
        a.moves.length === 1 &&
        /^[UDLRFB](?:'|2)?$/.test(a.moves[0]) &&
        ['cross-progress', 'cross'].includes(predicate),
      'cross',
      'Invalid cross action.',
    );
  else if (a.section === 'lab-f2l') {
    requireThat(pair, 'target', 'Missing F2L target.');
    if (a.ruleId === 'lab-f2l-insert') {
      const v = ALGORITHM_REGISTRY.variants[a.algorithmId ?? ''];
      requireThat(
        v &&
          v.startSignature === f2lSignature(engine, before, pair) &&
          a.caseId === v.caseId &&
          predicate === 'pair' &&
          a.pair?.phase === 'insert',
        'recognition',
        'Insertion does not match its recognized case.',
      );
    } else if (a.ruleId === 'lab-f2l-extract') {
      const o = engine.observe(before),
        c = o.corners.find((p) => p.id === pair.cornerId)!,
        e = o.edges.find((p) => p.id === pair.edgeId)!;
      const wrong = !c.slot.includes('U') && ![...pair.slot].every((f) => c.slot.includes(f));
      const slot = (wrong ? c.slot.replace('D', '') : e.slot).split('').sort().join('');
      const id = ['FR', 'FL', 'BR', 'BL'].find((s) => s.split('').sort().join('') === slot);
      requireThat(
        id &&
          a.algorithmId === `advanced-extract/${id.toLowerCase()}/toward` &&
          predicate === 'cross',
        'recognition',
        'Extraction is not bound to the occupied unsolved slot.',
      );
    } else if (a.ruleId === 'lab-f2l-hold')
      requireThat(
        a.kind === 'rotation' &&
          a.moves.length === 1 &&
          /^y(?:'|2)?$/.test(a.moves[0]) &&
          predicate === 'cross',
        'hold',
        'Invalid F2L rotation.',
      );
    else
      requireThat(
        a.ruleId === 'lab-f2l-align' &&
          a.kind === 'setup' &&
          a.moves.length === 1 &&
          /^U(?:'|2)?$/.test(a.moves[0]) &&
          predicate === 'cross',
        'setup',
        'Invalid F2L alignment.',
      );
  } else if (a.section === 'lab-auf')
    requireThat(
      a.ruleId === 'lab-auf' &&
        a.kind === 'setup' &&
        a.moves.length === 1 &&
        /^U(?:'|2)?$/.test(a.moves[0]) &&
        predicate === 'solved',
      'auf',
      'Invalid final alignment.',
    );
  else if (a.kind === 'algorithm') {
    const match = (a.section === 'lab-oll' ? recognizeAdvancedOLL : recognizeAdvancedPLL)(
      engine,
      before,
    );
    requireThat(
      a.ruleId === 'lab-last-layer-formula' &&
        match &&
        match.setup.length === 0 &&
        match.variantId === a.algorithmId &&
        match.caseId === a.caseId &&
        predicate === (a.section === 'lab-oll' ? 'oll' : 'pll'),
      'recognition',
      'Last-layer formula does not match its physical case.',
    );
  } else
    requireThat(
      ((a.ruleId === 'lab-last-layer-hold' &&
        a.kind === 'rotation' &&
        a.moves.length === 1 &&
        /^y(?:'|2)?$/.test(a.moves[0])) ||
        (a.ruleId === 'lab-last-layer-setup' &&
          a.kind === 'setup' &&
          a.moves.every((m) => /^U(?:'|2)?$/.test(m)))) &&
        predicate === (a.section === 'lab-oll' ? 'f2l' : 'oll'),
      'setup',
      'Invalid last-layer preparation.',
    );
}
