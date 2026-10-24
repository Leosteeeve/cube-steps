// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { createCubeEngine } from '../../core/cube';
import type { CubeEngine } from '../../core/types';
import { CMLL_CATALOG } from '../../methods/roux-advanced/cmll/catalog';
import { CMLL_CASE_IDS } from '../../methods/roux-advanced/cmll/ids';
import { CmllLibrary } from './CmllLibrary';
import { CmllCasePage } from './CmllCasePage';
import { CmllPractice } from './CmllPractice';
// WebGL animation is covered by browser checks; retain the source identity here.
vi.mock('../../player/PlaybackView', () => ({
  PlaybackView: ({ source }: { source: { prepared: { label: string } } }) => (
    <div role="status">{source.prepared.label}</div>
  ),
}));
let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});
afterEach(() => {
  cleanup();
  localStorage.clear();
});
it('lists exactly the admitted 42 classes and filters by family', () => {
  expect(CMLL_CASE_IDS).toEqual(CMLL_CATALOG.cases.map((c) => c.id));
  render(<CmllLibrary engine={engine} />);
  expect(screen.getAllByRole('link', { name: /Open CMLL/ })).toHaveLength(42);
  fireEvent.change(screen.getByLabelText('CMLL family'), { target: { value: 'H' } });
  expect(screen.getAllByRole('link', { name: /Open CMLL/ })).toHaveLength(4);
  fireEvent.change(screen.getByLabelText('Holding frame'), { target: { value: 'yellow-red' } });
  expect(screen.getByText(/yellow down and red left/)).toBeVisible();
});
it('changes the actual formula and prepared player when selecting an alternate', () => {
  const c = CMLL_CATALOG.cases.find((c) => c.variantIds.length > 1)!;
  render(<CmllCasePage engine={engine} caseId={c.id} />);
  fireEvent.change(screen.getByLabelText('Formula variant'), {
    target: { value: c.variantIds[1] },
  });
  expect(screen.getByTestId('cmll-formula')).toHaveTextContent(
    CMLL_CATALOG.variants[c.variantIds[1]].moves.join(' '),
  );
  expect(screen.getByRole('status')).toHaveTextContent(c.family);
  expect(screen.getAllByRole('link', { name: /Kian/ }).length).toBeGreaterThan(0);
});
it('handles empty and singleton drills, hides the answer and replays the same case', () => {
  localStorage.setItem(
    'cubesteps.club.cmll-practice.v1',
    JSON.stringify({ version: 1, caseIds: [], frameId: 'white-blue' }),
  );
  render(<CmllPractice engine={engine} />);
  expect(screen.getByText(/Select at least one case/)).toBeVisible();
  fireEvent.click(screen.getByLabelText('O · Adjacent Swap'));
  fireEvent.click(screen.getByRole('button', { name: 'Start practice' }));
  expect(screen.queryByTestId('cmll-formula')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Reveal answer' }));
  expect(screen.getByTestId('cmll-formula')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Next case' }));
  expect(screen.queryByTestId('cmll-formula')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Reveal answer' }));
  expect(within(screen.getByTestId('cmll-answer')).getByRole('status')).toHaveTextContent('CMLL');
});
