// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { LessonLayout } from './LessonLayout';
import { getCourse } from '../content/courses';
import { getMethod } from '../methods/registry';
import { lessonRoute } from './routes';
beforeEach(() =>
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
);
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it.each(['lbl', 'cfop-beginner', 'cfop-advanced'] as const)(
  'exposes every lesson after expanding the phone selector for %s',
  async (method) => {
    const course = getCourse(method);
    const { container } = render(
      <LessonLayout method={method} selected={course[0].id}>
        <p>Lesson</p>
      </LessonLayout>,
    );
    const disclosure = container.querySelector('details')!;
    expect(disclosure).toBeInTheDocument();
    expect(disclosure).not.toHaveAttribute('open');
    fireEvent.click(disclosure.querySelector('summary')!);
    await waitFor(() => expect(disclosure).toHaveAttribute('open'));
    const links = within(screen.getByRole('navigation', { name: 'Learning path' })).getAllByRole(
      'link',
    );
    expect(links.map((link) => link.getAttribute('href'))).toEqual(
      course.map((lesson) => lessonRoute(method, lesson.id)),
    );
    expect(links[0]).toHaveAttribute('aria-current', 'page');
  },
);
it('keeps the selected solve stage on collapse and uses the stage callback', async () => {
  const stages = getMethod('lbl').stages,
    choose = vi.fn();
  const { container, rerender } = render(
    <LessonLayout free selected={stages[0].id} onSelect={choose}>
      Solution
    </LessonLayout>,
  );
  const disclosure = container.querySelector('details')!;
  fireEvent.click(disclosure.querySelector('summary')!);
  await waitFor(() => expect(disclosure).toHaveAttribute('open'));
  fireEvent.click(
    within(screen.getByRole('navigation', { name: 'Solution stages' }))
      .getAllByRole('button')
      .at(-1)!,
  );
  expect(choose).toHaveBeenCalledWith(stages.at(-1)!.id);
  rerender(
    <LessonLayout free selected={stages.at(-1)!.id} onSelect={choose}>
      Solution
    </LessonLayout>,
  );
  fireEvent.click(disclosure.querySelector('summary')!);
  await waitFor(() => expect(disclosure).not.toHaveAttribute('open'));
  expect(disclosure.querySelector('summary')).toHaveTextContent('Solution stages');
  expect(disclosure.querySelector('summary')).toHaveTextContent(stages.at(-1)!.label);
});
