// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { useState } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { GuidanceProvider, type GuidanceLease } from '../ui/guidance';
import { createCubeEngine } from '../core/cube';
import { solveLBL } from '../methods/lbl/solve';
import { flattenTrace } from '../methods/shared/trace';
import { CubePlayer } from './CubePlayer';
import type { CubeEngine, SolveSession, StageId } from '../core/types';
vi.mock('./cubing-adapter', () => ({
  createCubingAdapter: vi.fn().mockRejectedValue(Error('Text fallback')),
}));
beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
async function fixture(moves = ['R', 'U2', "F'"]) {
  const engine = await createCubeEngine(),
    result = solveLBL(engine, engine.apply(engine.solved(), moves as never));
  if (!result.ok) throw Error(result.message);
  return {
    engine,
    session: { input: { kind: 'scramble', moves }, trace: result.trace } as SolveSession,
  };
}
function bridgeFixture() {
  let begin: (() => GuidanceLease) | undefined, lease: GuidanceLease | undefined;
  const emit = vi.fn();
  return {
    emit,
    begin: () => {
      lease = begin!();
      return lease;
    },
    bridge: {
      emit,
      registerTarget: () => () => {},
      registerScope: (_id: string, value: () => GuidanceLease) => {
        begin = value;
        return () => lease?.dispose();
      },
    },
  };
}
it('next at end cannot claim a move', async () => {
  const { engine, session } = await fixture(),
    b = bridgeFixture();
  render(
    <GuidanceProvider bridge={b.bridge}>
      <CubePlayer engine={engine} session={session} />
    </GuidanceProvider>,
  );
  await screen.findByRole('alert');
  const range = screen.getByLabelText('Move position');
  fireEvent.change(range, { target: { value: range.getAttribute('max') } });
  fireEvent.click(screen.getByRole('button', { name: 'Next move' }));
  expect(b.emit).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Previous move' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next move' }));
  expect(b.emit).toHaveBeenCalledWith({ name: 'player-next' });
});
it('restores the position after crossing a controlled stage boundary', async () => {
  const { engine, session } = await fixture(),
    b = bridgeFixture(),
    boundary = flattenTrace(session.trace).stages.find((s) => s.start > 1)!.start;
  function Controlled({ session: value }: { session: SolveSession }) {
    const [stage, setStage] = useState<StageId>('white-cross');
    return <CubePlayer engine={engine} session={value} stage={stage} onStageChange={setStage} />;
  }
  render(
    <GuidanceProvider bridge={b.bridge}>
      <Controlled session={session} />
    </GuidanceProvider>,
  );
  await screen.findByRole('alert');
  const range = screen.getByLabelText('Move position');
  fireEvent.change(range, { target: { value: boundary - 1 } });
  let lease!: GuidanceLease;
  act(() => {
    lease = b.begin();
  });
  fireEvent.click(screen.getByRole('button', { name: 'Next move' }));
  expect(range).toHaveValue(String(boundary));
  act(() => {
    lease.restore();
    lease.dispose();
  });
  await waitFor(() => expect(range).toHaveValue(String(boundary - 1)));
});
it('route/source replacement discards old restoration', async () => {
  const first = await fixture(),
    next = await fixture(['F', 'R']),
    b = bridgeFixture();
  const View = ({ engine, session }: { engine: CubeEngine; session: SolveSession }) => (
    <GuidanceProvider bridge={b.bridge}>
      <CubePlayer engine={engine} session={session} />
    </GuidanceProvider>
  );
  const v = render(<View {...first} />);
  await screen.findByRole('alert');
  let lease!: GuidanceLease;
  act(() => {
    lease = b.begin();
  });
  v.rerender(<View {...next} />);
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: 'Next move' }));
  act(() => lease.restore());
  expect(screen.getByLabelText('Move position')).toHaveValue('1');
});
