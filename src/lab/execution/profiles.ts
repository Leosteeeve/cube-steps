import { ALGORITHM_REGISTRY } from '../../algorithms/registry';
import { isTeachingMove } from '../../core/teaching-moves';
import type { TeachingMove } from '../../core/types';
import type { ExecutionCatalog, GripPose, GripTransition } from './types';

export const gripId = (left: number, right: number) => `l${left}r${right}`;
const poses: Record<string, GripPose> = {};
for (const left of [-1, 0, 1] as const)
  for (const right of [-1, 0, 1] as const) {
    const id = gripId(left, right);
    poses[id] = {
      id,
      leftWrist: left,
      rightWrist: right,
      leftThumb: left === 0 ? 'front support' : 'travels with the left wrist',
      rightThumb: right === 0 ? 'front support' : 'travels with the right wrist',
      support: 'both',
    };
  }
const tokens: ExecutionCatalog['tokens'] = {};
const provenance =
  'CubeSteps authored symbolic handling model; docs/lab/execution-model-v1.md; physical review pending.';
for (const base of [
  'U',
  'D',
  'R',
  'L',
  'F',
  'B',
  'Uw',
  'Dw',
  'Rw',
  'Lw',
  'Fw',
  'Bw',
  'M',
  'E',
  'S',
  'x',
  'y',
  'z',
])
  for (const suffix of ['', "'", '2']) {
    const move = (base + suffix) as TeachingMove;
    const transitions: GripTransition[] = [];
    for (const pose of Object.values(poses)) {
      const add = (to: string, instruction: string, awkward: GripTransition['awkward'] = 'none') =>
        transitions.push({ from: pose.id, to, instruction, awkward });
      const face = base[0],
        prime = suffix === "'",
        double = suffix === '2';
      if ('xyz'.includes(face)) {
        add(
          'l0r0',
          `Turn the whole cube ${move}; settle both hands into the neutral hold. Handling is included in this rotation.`,
        );
      } else if (face === 'R' || face === 'L') {
        const current = face === 'R' ? pose.rightWrist : pose.leftWrist;
        for (const delta of double ? [-2, 2] : [prime ? -1 : 1]) {
          const destination = current + delta;
          if (destination < -1 || destination > 1) continue;
          add(
            gripId(
              face === 'L' ? destination : pose.leftWrist,
              face === 'R' ? destination : pose.rightWrist,
            ),
            `Use the ${face === 'R' ? 'right' : 'left'} wrist for ${move}${base.includes('w') ? ' across both layers' : ''}; keep the other hand supporting the cube.`,
          );
        }
      } else if (face === 'U') {
        if (prime) {
          if (pose.leftWrist <= 0)
            add(
              pose.id,
              `Use the left index finger for ${move}; the right hand supports the cube.`,
            );
        } else if (pose.rightWrist >= 0) {
          add(
            pose.id,
            `Use ${double ? 'a right index-and-middle double flick' : 'the right index finger'} for ${move}.`,
          );
        } else if (pose.leftWrist === 0) {
          add(
            pose.id,
            `Use a left-hand reverse ${double ? 'double flick' : 'flick'} for ${move}; this is the less natural fallback in this right-leading model.`,
            'finger',
          );
        }
      } else if (face === 'D') {
        if (pose.leftWrist === 0)
          add(
            pose.id,
            `Use the left ring finger ${double ? 'twice ' : ''}for ${move}, keeping the upper grip steady.`,
            double ? 'finger' : 'none',
          );
      } else if (face === 'F') {
        if ((prime ? pose.leftWrist : pose.rightWrist) === 0)
          add(
            pose.id,
            `Use the ${prime ? 'left' : 'right'} index finger or thumb to ${prime ? 'pull' : 'push'} the front ${base.includes('w') ? 'two layers' : 'layer'} for ${move}.`,
          );
      } else if (face === 'B') {
        if ((prime ? pose.leftWrist : pose.rightWrist) === 0)
          add(
            pose.id,
            `Reach the back layer with the ${prime ? 'left' : 'right'} hand for ${move}; this rear-face finger action is marked awkward.`,
            'finger',
          );
      } else if (pose.leftWrist === 0 && pose.rightWrist === 0) {
        add(
          pose.id,
          `Use the free finger on the ${face === 'M' ? 'left' : 'right'} hand for ${move}, while the other fingers support the outer layers.`,
          'finger',
        );
      }
    }
    tokens[move] = { id: `lab-execution-v1/token/${move}`, move, transitions, provenance };
  }
const formulas: ExecutionCatalog['formulas'] = {};
for (const [id, formula] of Object.entries({
  ...ALGORITHM_REGISTRY.variants,
  ...ALGORITHM_REGISTRY.preparations,
})) {
  if (!formula.f2lExecution) continue;
  formulas[id] = {
    moves: [...formula.moves],
    rationale: formula.f2lExecution.rationale,
    recognition: formula.f2lExecution.recognition,
    provenance,
  };
}
export const EXECUTION_CATALOG: ExecutionCatalog = {
  version: 'lab-execution-v1',
  neutralGrip: 'l0r0',
  poses,
  tokens,
  formulas,
};

function feasibleTransition(move: string, from: GripPose, to: GripPose, neutral: string): boolean {
  const face = move[0];
  const prime = move.endsWith("'");
  if ('xyz'.includes(face)) return to.id === neutral;
  if (face === 'R' || face === 'L') {
    const delta = face === 'R' ? to.rightWrist - from.rightWrist : to.leftWrist - from.leftWrist;
    const supportingHandUnchanged =
      face === 'R' ? from.leftWrist === to.leftWrist : from.rightWrist === to.rightWrist;
    return (
      supportingHandUnchanged &&
      (move.endsWith('2') ? Math.abs(delta) === 2 : delta === (prime ? -1 : 1))
    );
  }
  if (from.leftWrist !== to.leftWrist || from.rightWrist !== to.rightWrist) return false;
  if (face === 'U')
    return prime ? from.leftWrist <= 0 : from.rightWrist >= 0 || from.leftWrist === 0;
  if (face === 'D') return from.leftWrist === 0;
  if (face === 'F' || face === 'B') return (prime ? from.leftWrist : from.rightWrist) === 0;
  return from.leftWrist === 0 && from.rightWrist === 0;
}

export function admitExecutionCatalog(catalog: ExecutionCatalog): void {
  if (catalog.version !== 'lab-execution-v1' || !catalog.poses[catalog.neutralGrip])
    throw Error('Invalid execution model or neutral grip.');
  for (const [id, pose] of Object.entries(catalog.poses)) {
    if (
      pose.id !== id ||
      ![-1, 0, 1].includes(pose.leftWrist) ||
      ![-1, 0, 1].includes(pose.rightWrist) ||
      !pose.leftThumb ||
      !pose.rightThumb ||
      pose.support !== 'both'
    )
      throw Error('Invalid grip pose.');
  }
  for (const [token, profile] of Object.entries(catalog.tokens)) {
    if (
      !isTeachingMove(token) ||
      profile.move !== token ||
      !profile.id ||
      !profile.provenance ||
      !profile.transitions.length
    )
      throw Error('Invalid token execution profile.');
    for (const transition of profile.transitions) {
      if (!catalog.poses[transition.from] || !catalog.poses[transition.to])
        throw Error('Unknown execution grip.');
      if (
        !feasibleTransition(
          token,
          catalog.poses[transition.from],
          catalog.poses[transition.to],
          catalog.neutralGrip,
        )
      )
        throw Error('Invalid physical grip transition.');
      if (
        !transition.instruction ||
        !['none', 'finger', 'grip', 'view'].includes(transition.awkward) ||
        Object.keys(transition).some((k) => !['from', 'to', 'instruction', 'awkward'].includes(k))
      )
        throw Error('Invalid execution transition.');
    }
  }
  for (const [id, profile] of Object.entries(catalog.formulas)) {
    const formula = ALGORITHM_REGISTRY.variants[id] ?? ALGORITHM_REGISTRY.preparations[id];
    if (
      !formula?.f2lExecution ||
      profile.moves.join(' ') !== formula.moves.join(' ') ||
      !profile.rationale ||
      !profile.provenance ||
      profile.recognition !== formula.f2lExecution.recognition ||
      profile.moves.some((move) => !catalog.tokens[move])
    )
      throw Error('Execution formula does not match the admitted catalog.');
  }
}
admitExecutionCatalog(EXECUTION_CATALOG);
