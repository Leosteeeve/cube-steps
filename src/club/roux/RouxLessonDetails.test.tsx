// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { RouxLessonDetails } from './RouxLessonDetails';
import { createCubeEngine } from '../../core/cube';
afterEach(cleanup);
it('gives a novice a complete teaching sequence and recovery advice', async () => {
  render(<RouxLessonDetails engine={await createCubeEngine()} lessonId="roux-first-block" />);
  for (const name of [
    'Look',
    'Prepare',
    'Do',
    'Check',
    'If something looks wrong',
    'Try it with your cube',
  ])
    expect(screen.getByRole('heading', { name })).toBeVisible();
  expect(screen.getAllByRole('img').length).toBeGreaterThan(0);
  expect(screen.getByRole('heading', { name: 'Keep these nearby.' })).toBeVisible();
  expect(screen.getByLabelText('Block maneuver group')).toHaveValue('slice');
  expect(screen.getByText(/Reference hold: blue left/)).toBeVisible();
  expect(screen.getByText('Middle slice: M')).toBeVisible();
  fireEvent.change(screen.getByLabelText('Block maneuver group'), { target: { value: 'trigger' } });
  const reference = screen.getByText("Open, adjust, close: R U R'").closest('details')!;
  fireEvent.click(reference.querySelector('summary')!);
  expect(reference).toHaveTextContent(
    'Protection: check the completed pieces after the whole maneuver',
  );
});
