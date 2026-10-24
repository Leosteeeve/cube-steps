// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, beforeAll, it, expect, vi } from 'vitest';
import { createCubeEngine } from '../core/cube';
import type { CubeEngine, TraceAction } from '../core/types';
import { RegripGuide } from './RegripGuide';
import { createSourcePlaybackController } from './controller';
import { createDemonstration } from '../algorithms/demonstration';
import { getCaseFixture } from '../algorithms/fixtures';
let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it('labels shifted Roux centers without asking the member to change their block hold', () => {
  const state = engine.apply(engine.solved(), ['x2', 'y', 'M']);
  render(<RegripGuide engine={engine} boundaryState={state} moving={false} sliceMethod />);
  expect(screen.getByLabelText('Current centers')).toHaveTextContent('Centers now:');
  expect(screen.queryByText('Holding now:')).not.toBeInTheDocument();
  expect(screen.getByText(/keep your block frame/i)).toBeVisible();
});
it('does not describe wide and slice turns as whole-cube rotations', () => {
  const before = engine.solved();
  const action: TraceAction = {
    kind: 'algorithm',
    ruleId: 'wide',
    caseId: 'wide',
    targets: [],
    recognition: '',
    explanation: '',
    moves: ['Rw', 'M'],
    before,
    after: engine.apply(before, ['Rw', 'M']),
    checkpoint: { id: 'wide', description: '', passed: true },
  };
  render(<RegripGuide engine={engine} boundaryState={before} action={action} moving={false} />);
  expect(screen.queryByText(/physical rotations inside/i)).toBeNull();
  expect(screen.getByText(/layer.*slice/i)).toBeVisible();
});
it('keeps the current hold distinct from the pending rotation destination', () => {
  const before = engine.apply(engine.solved(), ['z2']),
    after = engine.apply(before, ['y']);
  const action: TraceAction = {
    kind: 'regrip',
    ruleId: 'test',
    caseId: 'test',
    targets: [],
    recognition: '',
    explanation: 'Keep white down.',
    moves: ['y'],
    before,
    after,
    checkpoint: { id: 'test', description: 'Rotated', passed: true },
  };
  const view = render(
    <RegripGuide engine={engine} boundaryState={before} action={action} moving />,
  );
  expect(screen.getByLabelText('Current holding')).toHaveTextContent('yellow up · green front');
  expect(screen.getByLabelText('After this regrip')).toHaveTextContent('yellow up · orange front');
  view.rerender(<RegripGuide engine={engine} boundaryState={after} moving={false} />);
  expect(screen.getByLabelText('Current holding')).toHaveTextContent('orange front');
  view.rerender(
    <RegripGuide engine={engine} boundaryState={before} action={action} moving={false} />,
  );
  expect(screen.getByLabelText('Current holding')).toHaveTextContent('green front');
});
it('follows completed boundaries through an internal formula rotation and back', () => {
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  const demo = createDemonstration(engine, getCaseFixture('f2l-03/fr/u0')!, 'f2l-03/main/fr');
  const controller = createSourcePlaybackController(engine, {
    kind: 'algorithm',
    demonstration: demo,
  });
  const index = controller.timeline.moves.findIndex((m) => m === "y'");
  expect(index).toBeGreaterThan(0);
  const view = render(
    <RegripGuide
      engine={engine}
      boundaryState={controller.snapshot().boundaryState}
      moving={false}
    />,
  );
  for (const i of [index, index + 1, index]) {
    controller.seekMove(i);
    const s = controller.snapshot();
    view.rerender(
      <RegripGuide
        engine={engine}
        boundaryState={s.boundaryState}
        action={controller.timeline.actions[s.actionIndex]?.action}
        moving={false}
      />,
    );
    expect(screen.getByLabelText('Current holding')).toHaveTextContent(
      i === index ? 'green front' : 'red front',
    );
  }
  controller.dispose();
});
