import type { CubeObservation, Face, TeachingMove } from '../../core/types';
import { LBL_ALGORITHMS } from './catalog';
import { checkStage, pieceSolved } from './stages';
import { RuleError, type LBLContext, type StageResult } from './trace';
import {
  chooseTurn,
  describe,
  findPiece,
  hold,
  observation,
  runRule,
  setup,
  target,
} from './rule-helpers';

const whiteEdges = ['UF', 'UR', 'UB', 'UL'];
const petals = (o: CubeObservation) => o.edges.filter((piece) => piece.stickers.U === 'white');

function daisyMove(
  c: LBLContext,
  moves: TeachingMove[],
  ruleId: string,
  explanation: string,
  id: string,
  addsPetal = false,
): void {
  if (!moves.length) return;
  const existing = petals(observation(c)).map((piece) => piece.id);
  const nextPetals = petals(c.engine.observe(c.engine.apply(c.trace.current, moves)));
  const expected = nextPetals.length;
  const bonus = nextPetals.filter((piece) => !existing.includes(piece.id) && piece.id !== id);
  c.trace.append({
    kind: 'setup',
    ruleId,
    caseId: target(c, id).slot,
    targets: [id, ...bonus.map((piece) => piece.id)],
    recognition: `${existing.length} of 4 white petals surround the yellow center. ${describe(c, id)}`,
    explanation:
      explanation +
      (bonus.length
        ? ' This turn also adds another white petal; keep it on top for the remaining lifts.'
        : ''),
    moves,
    check: {
      id: addsPetal ? 'daisy-petal-added' : 'daisy-petals-preserved',
      description:
        expected === 4
          ? 'The daisy is complete: four white petals surround the yellow center. Side colors can wait until the next step.'
          : `${expected} of 4 white petals face up around yellow. Keep those petals on top; side colors do not need to match yet.`,
      test: (state) => {
        const after = c.engine.observe(state),
          next = petals(after).map((piece) => piece.id);
        return (
          after.centers.U === 'yellow' &&
          next.length >= existing.length + (addsPetal ? 1 : 0) &&
          existing.every((piece) => next.includes(piece)) &&
          (!addsPetal || next.includes(id))
        );
      },
    },
  });
}

function clearPetalSlot(c: LBLContext, face: Face, id: string): void {
  daisyMove(
    c,
    chooseTurn(
      c,
      'U',
      (o) => o.edges.find((piece) => piece.slot === `U${face}`)?.stickers.U !== 'white',
    ),
    'daisy-clear-slot',
    `Turn only the top to move an existing white petal away from the ${face} face. This leaves an empty petal position above that face without losing the white petals already collected.`,
    id,
  );
}

export function solveWhiteCross(c: LBLContext): StageResult {
  return runRule(c, () => {
    if (checkStage(c.engine, c.trace.current, 'white-cross')) return;
    hold(c, 'yellow', 'U');
    for (const id of whiteEdges) {
      let piece = target(c, id);
      if (piece.stickers.U === 'white') continue;
      if (piece.stickers.D === 'white') {
        const face = piece.slot.replace('D', '') as Face;
        clearPetalSlot(c, face, id);
        daisyMove(
          c,
          [`${face}2`],
          'daisy-lift-bottom',
          `The white sticker faces down. Turn ${face} halfway to lift it into the open petal position around yellow.`,
          id,
          true,
        );
        continue;
      }
      if (piece.slot.includes('U') || piece.slot.includes('D')) {
        const face = piece.slot.replace(/[UD]/, '') as Face;
        if (piece.slot.includes('D')) clearPetalSlot(c, face, id);
        daisyMove(
          c,
          [face],
          'daisy-extract-sideways',
          `The white sticker points sideways. Turn ${face} a quarter turn to bring this edge into the middle layer; then lift its white sticker upward.`,
          id,
        );
      }
      piece = target(c, id);
      const choices = ['F', "F'", 'R', "R'", 'B', "B'", 'L', "L'"] as TeachingMove[];
      // A middle-layer white edge has one quarter turn that lifts its white sticker onto U.
      const lift = choices.find(
        (move) =>
          findPiece(c.engine.observe(c.engine.apply(c.trace.current, [move])), id).stickers.U ===
          'white',
      );
      if (!lift || piece.slot.includes('U') || piece.slot.includes('D'))
        throw new RuleError('unsupported-case', 'white-cross', 'No middle-edge petal lift fits.');
      clearPetalSlot(c, lift[0] as Face, id);
      daisyMove(
        c,
        [lift],
        'daisy-lift-middle',
        `The white edge is in the middle layer. Turn ${lift} to lift its white sticker into the open position beside yellow.`,
        id,
        true,
      );
    }
    if (petals(observation(c)).length !== 4)
      throw new RuleError(
        'verification',
        'white-cross',
        'Complete all four daisy petals before lowering any.',
      );

    const lowered: string[] = [];
    for (const id of whiteEdges) {
      const other = Object.values(target(c, id).stickers).find((color) => color !== 'white')!;
      setup(
        c,
        chooseTurn(c, 'y', (o) => o.centers.F === other),
        'cross-match-center',
        `Keep yellow up and rotate the whole cube to bring the ${other} center to the front. This is the center to match with the petal's other sticker.`,
        id,
      );
      setup(
        c,
        chooseTurn(c, 'U', (o) => findPiece(o, id).slot === 'UF'),
        'cross-align-petal',
        `Turn only the top until this white petal's ${other} side sticker sits directly above the ${other} front center. Match the side color before turning the petal down.`,
        id,
      );
      const piece = target(c, id);
      if (piece.stickers.U !== 'white' || piece.stickers.F !== observation(c).centers.F)
        throw new RuleError(
          'verification',
          'white-cross',
          'The petal must match the front center before lowering.',
        );
      lowered.push(id);
      c.trace.append({
        kind: 'algorithm',
        algorithmId: 'daisy-to-cross',
        ruleId: 'cross-lower-petal',
        caseId: 'aligned-petal',
        targets: [id],
        recognition: `The ${other} sticker on the white petal matches the ${other} front center. White faces up beside yellow.`,
        explanation:
          'Turn the front face 180° to send this matched white petal down beside the white center. Keep yellow up and repeat for each remaining petal.',
        moves: [...LBL_ALGORITHMS['daisy-to-cross'].moves],
        repetition: { group: 'daisy-to-cross', index: lowered.length },
        check: {
          id: 'matched-white-edge-down',
          description: `${lowered.length} of 4 white cross edges are matched on the bottom.${lowered.length === 4 ? ' The white cross is complete: white down, all four side colors matched.' : ' The remaining white petals stay around yellow.'}`,
          test: (state) => {
            const after = c.engine.observe(state);
            return (
              after.centers.D === 'white' &&
              petals(after).length === 4 - lowered.length &&
              lowered.every((edge) => pieceSolved(findPiece(after, edge), after))
            );
          },
        },
      });
    }
  });
}
