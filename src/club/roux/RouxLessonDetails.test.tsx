// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup } from '@testing-library/react';
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
});
