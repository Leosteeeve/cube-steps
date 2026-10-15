// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { TrialTimer } from './TrialTimer';
import { createTrial } from '../../lab/trials/machine';
import { createCubeEngine } from '../../core/cube';
import { fixtureLabRoute } from '../../../tests/fixtures/lab-context';
import { prepareLabInput } from '../../lab/input';
import type { LabRoute } from '../../lab/types';
import { TrialHistory } from './TrialHistory';
import { attemptFixture, experimentFixture } from '../../lab/experiments/fixtures.test-helper';
import type { LabRepository } from '../../lab/experiments/repository';
import type { LabExperiment } from '../../lab/experiments/types';
let complete: LabRoute, partial: LabRoute, historyExperiment: LabExperiment;
beforeAll(async () => {
  historyExperiment = (await experimentFixture()).experiment;
  const engine = await createCubeEngine();
  complete = fixtureLabRoute(engine, prepareLabInput(engine, { kind: 'scramble', moves: [] }));
  partial = fixtureLabRoute(
    engine,
    prepareLabInput(engine, { kind: 'scramble', moves: ['R', 'D', "R'"] }),
  );
});
afterEach(cleanup);
it('corrects optional ratings in a new revision without changing recorded conditions', async () => {
  const a = attemptFixture(historyExperiment.id, historyExperiment.routes[0].id),
    saveAttempt = vi.fn(async () => {});
  render(
    <TrialHistory
      attempts={[a]}
      experiment={historyExperiment}
      repository={{ saveAttempt } as unknown as LabRepository}
      disabled={false}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Correct trial' }));
  fireEvent.change(screen.getByLabelText('Corrected flow'), { target: { value: '4' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save correction' }));
  await waitFor(() =>
    expect(saveAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        id: a.id,
        revision: 1,
        previousRevision: 0,
        flow: 4,
        recognition: undefined,
        timingMethod: 'keyboard',
        routeId: a.routeId,
      }),
      0,
    ),
  );
});
const conditions = {
  experimentId: 'e',
  routeId: 'r',
  testerId: 't',
  kind: 'measured' as const,
  timingMethod: 'external-manual' as const,
  endpoint: 'cross-f2l' as const,
};
it('shows a zero-work checkpoint and disables measured timing', () => {
  render(
    <TrialTimer
      route={complete}
      conditions={conditions}
      active
      memory={{ current: null }}
      quiesce={() => {}}
      onActivity={() => {}}
      onReview={() => {}}
      onSave={async () => {}}
    />,
  );
  expect(screen.getByText(/Cross and F2L are already complete/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Review external time' })).toBeDisabled();
});
it('keeps a partial route valid and requires review without asserting success', () => {
  const save = vi.fn(),
    memory = { current: null };
  render(
    <TrialTimer
      route={partial}
      conditions={conditions}
      active
      memory={memory}
      quiesce={() => {}}
      onActivity={() => {}}
      onReview={() => {}}
      onSave={save}
    />,
  );
  expect(screen.getByText(/Cross is already complete/)).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText(/I reset the original cube/));
  fireEvent.click(screen.getByLabelText(/I matched the starting hold/));
  fireEvent.change(screen.getByLabelText('External time'), { target: { value: '12.34' } });
  fireEvent.click(screen.getByRole('button', { name: 'Review external time' }));
  expect(screen.getByLabelText('Outcome')).toHaveValue('');
  expect(screen.getByRole('button', { name: 'Save trial' })).toBeDisabled();
  expect(save).not.toHaveBeenCalled();
});
it('resumes an unsaved review from club-session memory', () => {
  const state = createTrial(conditions),
    memory = {
      current: {
        ...state,
        status: 'review' as const,
        draft: {
          ...conditions,
          rawMs: 12340,
          setupConfirmed: true,
          holdConfirmed: true,
          outcome: null,
          interruption: null,
        },
      },
    };
  render(
    <TrialTimer
      route={partial}
      conditions={conditions}
      active
      memory={memory}
      quiesce={() => {}}
      onActivity={() => {}}
      onReview={() => {}}
      onSave={async () => {}}
    />,
  );
  expect(screen.getByRole('heading', { name: 'Review this trial' })).toBeInTheDocument();
  expect(screen.getByText('12.34 s')).toBeInTheDocument();
});
it('uses the new planned slot after an asynchronous save changes conditions', async () => {
  const memory = {
    current: {
      ...createTrial(conditions),
      status: 'review' as const,
      draft: {
        ...conditions,
        rawMs: 12340,
        setupConfirmed: true,
        holdConfirmed: true,
        outcome: 'followed' as const,
        interruption: null,
      },
    },
  };
  let finish!: () => void;
  const save = () =>
    new Promise<void>((resolve) => {
      finish = resolve;
    });
  const props = {
    route: partial,
    active: true,
    memory,
    quiesce: () => {},
    onActivity: () => {},
    onReview: () => {},
    onSave: save,
  };
  const view = render(<TrialTimer {...props} conditions={conditions} />);
  fireEvent.click(screen.getByRole('button', { name: 'Save trial' }));
  const next = { ...conditions, routeId: 'next-route' };
  view.rerender(<TrialTimer {...props} conditions={next} />);
  await act(async () => finish());
  await waitFor(() => expect(memory.current.conditions.routeId).toBe('next-route'));
});
