// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { createCubeEngine } from '../../core/cube';
import { LabSessionProvider, useLabSession } from './LabSessionProvider';
import type { LabClient, LabClientSnapshot } from '../../lab/client';
import { LabCubeNet } from './LabCubeNet';
import { stateToFacelets } from '../../core/facelets';
afterEach(cleanup);
it('keeps one client across Lab tabs and quiesces search/playback before trials', async () => {
  const engine = await createCubeEngine(),
    pause = vi.fn();
  let listener = () => {},
    snapshot: LabClientSnapshot = { requestId: 0, phase: 'idle', routes: [] };
  const client: LabClient = {
    snapshot: () => snapshot,
    subscribe: (fn) => {
      listener = fn;
      return () => {
        listener = () => {};
      };
    },
    dispose: vi.fn(),
    stop: vi.fn(),
    analyze: vi.fn(() => {
      snapshot = { requestId: 1, phase: 'searching', routes: [] };
      listener();
    }),
  };
  const factory = vi.fn(() => client);
  function Probe() {
    const api = useLabSession();
    return (
      <>
        <p>{api.state.view}</p>
        <input
          aria-label="Draft"
          value={api.state.draft.text}
          onChange={(e) => api.edit({ type: 'edit', text: e.target.value })}
        />
        <button onClick={api.analyze}>Analyze test</button>
        <button
          onClick={() => {
            api.registerPlayback({ pause });
            api.quiesce();
          }}
        >
          Trial
        </button>
      </>
    );
  }
  const view = render(
    <LabSessionProvider engine={engine} view="analyze" clientFactory={factory}>
      <Probe />
    </LabSessionProvider>,
  );
  fireEvent.change(screen.getByLabelText('Draft'), { target: { value: 'R U' } });
  fireEvent.click(screen.getByText('Analyze test'));
  expect(client.analyze).toHaveBeenCalledWith(
    { kind: 'scramble', moves: ['R', 'U'] },
    expect.objectContaining({ allowedColors: expect.arrayContaining(['white', 'yellow']) }),
  );
  view.rerender(
    <LabSessionProvider engine={engine} view="compare" clientFactory={factory}>
      <Probe />
    </LabSessionProvider>,
  );
  expect(screen.getByLabelText('Draft')).toHaveValue('R U');
  expect(factory).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByText('Trial'));
  expect(pause).toHaveBeenCalledOnce();
  expect(client.stop).toHaveBeenCalled();
  view.unmount();
  expect(client.dispose).toHaveBeenCalledOnce();
});
it('labels a six-face diagram using its actual rotated centers', async () => {
  const engine = await createCubeEngine(),
    facelets = stateToFacelets(engine.apply(engine.solved(), ['x', 'y']));
  render(<LabCubeNet facelets={facelets} label="Actual hold" />);
  expect(screen.getByRole('img', { name: 'Actual hold' })).toBeVisible();
  expect(
    screen.getByText(`${facelets.U[4]} up · ${facelets.D[4]} bottom · ${facelets.F[4]} front`),
  ).toBeVisible();
});
