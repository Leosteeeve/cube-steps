// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
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
beforeEach(async () => {
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
it('finds families, names and identifiers without confusing Sune and Anti-Sune', () => {
  render(<CmllLibrary engine={engine} />);
  const search = screen.getByRole('searchbox');
  for (const [term, count] of [
    ['Sune', 6],
    ['H', 4],
    ['Right Bar', 4],
    ['cmll-anti-sune-2', 1],
    ['Anti Sune 2', 1],
    ['Pi3', 1],
    ['Pi10', 0],
  ] as const) {
    fireEvent.change(search, { target: { value: term } });
    expect(screen.queryAllByRole('link', { name: /Open CMLL/ })).toHaveLength(count);
  }
  fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
  expect(screen.getByRole('status')).toHaveTextContent('42 cases');
});

it('keeps the holding frame in the diagram, detail link and drill, and separates drafts from saved settings', async () => {
  const key = 'cubesteps.club.cmll-practice.v1';
  const saved = JSON.stringify({ version: 1, caseIds: ['cmll-o-2'], frameId: 'white-blue' });
  localStorage.setItem(key, saved);
  const library = render(<CmllLibrary engine={engine} />);
  fireEvent.change(screen.getByLabelText('CMLL family'), { target: { value: 'H' } });
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'H1' } });
  const card = screen.getByRole('article');
  const topCenter = () =>
    within(card).getByRole('img').querySelector('[data-piece="U"][data-face="U"]');
  expect(topCenter()).toHaveAttribute('data-color', 'yellow');
  fireEvent.change(screen.getByLabelText('Holding frame'), { target: { value: 'yellow-red' } });
  expect(topCenter()).toHaveAttribute('data-color', 'white');
  expect(within(card).getByRole('link')).toHaveAttribute(
    'href',
    '#/cmll/cmll-h-1?frame=yellow-red',
  );
  fireEvent.click(screen.getByRole('button', { name: 'Select filtered cases' }));
  expect(localStorage.getItem(key)).toBe(saved);
  library.unmount();
  const returned = render(<CmllLibrary engine={engine} />);
  expect(screen.getByRole('searchbox')).toHaveValue('H1');
  expect(screen.getByLabelText('CMLL family')).toHaveValue('H');
  expect(screen.getByRole('checkbox')).toBeChecked();
  fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
  expect(screen.getByLabelText('Holding frame')).toHaveValue('yellow-red');
  expect(screen.getAllByRole('checkbox', { checked: true })).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: 'Practice selected cases' }));
  expect(location.hash).toBe('#/cmll-practice');
  returned.unmount();
  const practice = render(<CmllPractice engine={engine} />);
  expect(screen.getByLabelText('Holding frame')).toHaveValue('yellow-red');
  expect(screen.getByLabelText('H · Columns', { exact: true })).toBeChecked();
  expect(screen.getByLabelText('O · Diagonal Swap', { exact: true })).toBeChecked();
  fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }));
  practice.unmount();
  render(<CmllLibrary engine={engine} />);
  expect(screen.getAllByRole('checkbox', { checked: false })).toHaveLength(42);
});

it('hands a temporary drill to practice while preserving an unreadable saved record', async () => {
  const key = 'cubesteps.club.cmll-practice.v1';
  localStorage.setItem(key, 'unreadable');
  const library = render(<CmllLibrary engine={engine} />);
  fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }));
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Pi3' } });
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'Practice selected cases' }));
  library.unmount();
  render(<CmllPractice engine={engine} />);
  expect(screen.getByLabelText('Pi · X Checkerboard')).toBeChecked();
  expect(screen.getAllByRole('checkbox', { checked: true })).toHaveLength(1);
  expect(localStorage.getItem(key)).toBe('unreadable');
});
