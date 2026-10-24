// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { createRef, useState } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it } from 'vitest';
import { CubeStage } from './CubeStage';
import type { CubeViewPreferences } from './view-preferences';
afterEach(cleanup);

it('changes view preferences while preserving the renderer host and physical holding label', async () => {
  const user = userEvent.setup(),
    host = createRef<HTMLDivElement>();
  function Example() {
    const [prefs, setPrefs] = useState<CubeViewPreferences>({
      version: 1,
      background: 'dark',
      showNet: false,
      showBackFaces: false,
    });
    return (
      <CubeStage
        hostRef={host}
        preferences={prefs}
        onPreferencesChange={setPrefs}
        onResetView={() => {}}
        holding={<p>Holding: white down, green front</p>}
      >
        <p>Current move: U′</p>
      </CubeStage>
    );
  }
  render(<Example />);
  const original = host.current;
  const renderer = document.createElement('canvas');
  original?.append(renderer);
  await user.click(screen.getByText('View settings'));
  await user.click(screen.getByRole('checkbox', { name: 'Light cube background' }));
  expect(screen.getByRole('checkbox', { name: 'Light cube background' })).toBeChecked();
  await user.click(screen.getByRole('checkbox', { name: 'Back-face view aid' }));
  expect(host.current).toBe(original);
  expect(renderer.isConnected).toBe(true);
  expect(screen.getByText('Holding: white down, green front')).toBeVisible();
  expect(screen.getByText('Current move: U′')).toBeVisible();
});
