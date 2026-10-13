// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { createCubeEngine } from '../../core/cube';
import type { CubeEngine } from '../../core/types';
import { ALGORITHM_REGISTRY as registry } from '../../algorithms/registry';
import { getCaseFixture } from '../../algorithms/fixtures';
import { AlgorithmLibraryPage } from './AlgorithmLibraryPage';
import { AlgorithmDetailPage } from './AlgorithmDetailPage';
import { CaseDiagram } from './CaseDiagram';
import { parseRoute } from '../routes';
import { practiceStore } from '../../practice/storage';
vi.mock('../../player/AlgorithmPlayer', () => ({
  AlgorithmPlayer: ({ demonstration }: any) => (
    <output data-testid="clip">{demonstration.variantId}</output>
  ),
}));
let engine: CubeEngine;
beforeAll(async () => {
  engine = await createCubeEngine();
});
afterEach(cleanup);
it('passes library preselection into the shared practice selection', async () => {
  practiceStore.save({ version: 1, caseIds: [], groupIds: [] });
  render(<AlgorithmLibraryPage engine={engine} />);
  const user = userEvent.setup();
  await user.click(await screen.findByRole('checkbox', { name: 'Select OLL 20' }));
  await user.click(screen.getByRole('button', { name: 'Practice selected cases' }));
  expect(location.hash).toBe('#/practice');
  expect(practiceStore.load().selection.caseIds).toEqual(['oll-20']);
  expect(parseRoute('#/practice')).toEqual({ kind: 'practice' });
  practiceStore.save({ version: 1, caseIds: [], groupIds: [] });
});
it('filters_all_119_cases', async () => {
  render(<AlgorithmLibraryPage engine={engine} />);
  expect(await screen.findAllByRole('link', { name: /Explore / })).toHaveLength(119);
  const user = userEvent.setup();
  for (const [family, total] of [
    ['f2l', 41],
    ['oll', 57],
    ['pll', 21],
  ] as const) {
    await user.selectOptions(screen.getByLabelText('Family'), family);
    expect(screen.getAllByRole('link', { name: /Explore / })).toHaveLength(total);
    const group = Object.values(registry.cases).find((c) => c.family === family)!.group;
    await user.selectOptions(screen.getByLabelText('Group'), group);
    const expected = Object.values(registry.cases).filter(
      (c) => c.family === family && c.group === group,
    );
    expect(screen.getAllByRole('link', { name: /Explore / })).toHaveLength(expected.length);
    await user.type(screen.getByLabelText('Search cases'), expected[0].id);
    expect(screen.getAllByRole('link', { name: /Explore / })).toHaveLength(1);
    expect(screen.getByRole('link', { name: /Explore / })).toHaveAttribute(
      'href',
      '#/algorithms/' + expected[0].id,
    );
    await user.clear(screen.getByLabelText('Search cases'));
  }
  expect(parseRoute('#/algorithms')).toEqual({ kind: 'algorithms' });
  expect(parseRoute('#/algorithms/oll-20')).toEqual({ kind: 'algorithm', caseId: 'oll-20' });
});
it('links_recognition_to_matching_variant', async () => {
  render(<AlgorithmDetailPage engine={engine} caseId="f2l-01" />);
  const c = registry.cases['f2l-01'],
    first = registry.variants[c.defaultVariantId];
  expect(await screen.findByTestId('clip')).toHaveTextContent(first.id);
  expect(screen.getByTestId('selected-formula')).toHaveTextContent(first.moves.join(' '));
  const other = c.variantIds.find((id) => id.endsWith('/br'))!;
  await userEvent.setup().selectOptions(screen.getByLabelText('Formula variant'), other);
  expect(screen.getByTestId('clip')).toHaveTextContent(other);
  expect(screen.getByTestId('selected-formula')).toHaveTextContent(
    registry.variants[other].moves.join(' '),
  );
  for (const segment of registry.variants[other].segments ?? [])
    expect(screen.getByTestId('formula-segments')).toHaveTextContent(segment.label);
  expect(screen.getAllByRole('link', { name: /CubeSkills/ })[0]).toHaveAttribute(
    'href',
    first.sourceRefs[0].url,
  );
  expect(c.defaultVariantId).toBe(first.id);
});
it('renders_diagram_from_fixture', () => {
  const f = getCaseFixture('f2l-01/fr/u0')!;
  const { container } = render(
    <CaseDiagram state={f.initial} targets={[f.target!.cornerId, f.target!.edgeId]} />,
  );
  expect(screen.getByRole('img', { name: 'Recognition view' })).toBeVisible();
  const o = engine.observe(f.initial);
  for (const p of [...o.edges, ...o.corners].filter((p) =>
    [f.target!.cornerId, f.target!.edgeId].includes(p.id),
  ))
    for (const [face, color] of Object.entries(p.stickers))
      expect(
        container.querySelector('[data-piece="' + p.id + '"][data-face="' + face + '"]'),
      ).toHaveAttribute('data-color', color);
  expect(container.querySelectorAll('[data-color="hidden"]').length).toBeGreaterThan(0);
});
it.each(['not-a-case', 'constructor', 'toString', '__proto__'])(
  'shows_unknown_case_fallback for %s',
  (caseId) => {
    render(<AlgorithmDetailPage engine={engine} caseId={caseId} />);
    expect(screen.getByRole('heading', { name: 'Case not found.' })).toBeVisible();
    expect(screen.queryByTestId('clip')).not.toBeInTheDocument();
  },
);
