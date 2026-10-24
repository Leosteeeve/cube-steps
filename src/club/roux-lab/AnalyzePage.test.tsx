// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { AnalyzePage } from './AnalyzePage';
import { initialRouxLabSession, reduceRouxLabSession } from './session';
import { rouxLabContext, fixtureRouxRoute } from '../../../tests/helpers/roux-lab-route';
it('labels an excluded selected route as a playable reference with current evidence', async () => {
  const { engine, assets } = await rouxLabContext(),
    baseline = fixtureRouxRoute(engine, assets);
  if (!baseline.score.rated) throw Error('Expected a rated fixture');
  const selected = {
    ...baseline,
    id: 'selected-reference',
    basis: 'optimized' as const,
    counts: { ...baseline.counts, first: 8 },
    score: { ...baseline.score, rated: true as const, cost: 1 },
  };
  let state = reduceRouxLabSession(initialRouxLabSession(['white-blue']), {
    type: 'start',
    input: baseline.input,
  });
  state = {
    ...state,
    routes: [baseline, selected],
    selectedId: selected.id,
    coverage: {
      elapsedMs: 20,
      operations: 1,
      entries: 0,
      retainedBytes: 0,
      verifiedRoutes: 2,
      frames: {
        'white-blue': {
          status: 'best-found',
          lowerBound: 1,
          upperBound: 2,
          witness: ['F', 'U'],
          completedDepth: 0,
        },
      },
    },
  };
  render(
    <AnalyzePage
      engine={engine}
      state={state}
      onStart={() => {}}
      onEdit={() => {}}
      onFrames={() => {}}
      onSelect={() => {}}
      onCompare={() => {}}
    />,
  );
  const reference = screen.getByText('PLAYBACK REFERENCE').closest('article')!;
  expect(within(reference).getByRole('button', { name: 'Play full solve' })).toBeEnabled();
  expect(reference).toHaveTextContent('outside the current recommendation window');
  expect(reference).toHaveTextContent('2 STM');
});
