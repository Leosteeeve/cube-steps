import { expect, it } from 'vitest';
import { rouxLabContext } from '../../../tests/helpers/roux-lab-route';
import { ROUX_FRAMES } from './frames';
import { invertTeachingMoves } from '../../core/teaching-moves';
import { stateToFacelets } from '../../core/facelets';
import { prepareRouxInput } from './input';
import { describeBlockCandidate } from './blocks/candidates';
import { completeRouxCandidate } from './complete';
import { createRouxSearchBudget } from './budget';
import type { TeachingMove } from '../../core/types';
it('explains a real alternate that wins the CMLL plus combined-LSE comparison', async () => {
  const { engine: e, assets } = await rouxLabContext(),
    frame = ROUX_FRAMES.find((f) => f.id === 'white-blue')!;
  const heldSolved = e.apply(e.solved(), frame.positioningMoves);
  let chosen;
  for (const group of assets.cmll.cases.filter((c) => c.variantIds.length > 1)) {
    for (const edgeSetup of [
      [],
      ['M'],
      ['U'],
      ['M2', 'U'],
      ['M', 'U2', "M'"],
    ] as TeachingMove[][]) {
      const variant = assets.cmll.variants[group.variantIds[1]],
        state = e.apply(heldSolved, [...edgeSetup, ...invertTeachingMoves(variant.moves)]),
        original = e.apply(state, invertTeachingMoves(frame.positioningMoves)),
        input = prepareRouxInput(e, { kind: 'facelets', facelets: stateToFacelets(original) }),
        first = describeBlockCandidate(e, state, frame, []),
        result = completeRouxCandidate(
          e,
          input,
          frame,
          { first, secondMoves: [], secondTurns: 0, state, actions: [] },
          assets,
          createRouxSearchBudget('lab', { now: () => 0 }),
        );
      chosen = result.trace.stages[3].actions.find((a) => a.algorithmId?.endsWith('-alternate'));
      if (chosen) break;
    }
    if (chosen) break;
  }
  expect(chosen).toBeDefined();
  expect(chosen!.explanation).toContain('CMLL + combined LSE');
  expect(chosen!.explanation).toMatch(/compared \d+ complete continuations/);
  expect(chosen!.explanation).toMatch(/primary.*cost/i);
  expect(chosen!.explanation).toContain('not a measured human speed');
  const costs = chosen!.explanation.match(
    /Selected modeled cost (\d+); the best completed primary continuation cost (\d+)/,
  )!;
  expect(Number(costs[1])).toBeLessThan(Number(costs[2]));
}, 30000);
