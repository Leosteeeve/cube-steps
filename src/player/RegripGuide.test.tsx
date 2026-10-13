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
