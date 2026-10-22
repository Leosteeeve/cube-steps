// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { expect, it, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
afterEach(cleanup);
import { render, screen } from '@testing-library/react';
import { EditionProvider } from './edition';
import { MethodSelector } from './MethodSelector';
it('offers Roux only in club navigation', () => {
  const view = render(<MethodSelector method="lbl" kind="learn" />);
  expect(screen.queryByRole('link', { name: 'Beginner Roux' })).toBeNull();
  view.rerender(
    <EditionProvider edition="club">
      <MethodSelector method="roux-beginner" kind="learn" />
    </EditionProvider>,
  );
  expect(screen.getByRole('link', { name: 'Beginner Roux' })).toHaveAttribute(
    'href',
    '#/learn/roux/intro',
  );
});
