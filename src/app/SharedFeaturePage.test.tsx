// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen, fireEvent } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useCubeEngine } from './use-cube-engine';
import { EditionProvider, useEdition } from './edition';
const load = vi.hoisted(() => vi.fn());
vi.mock('../core/cube', () => ({ createCubeEngine: load }));
afterEach(cleanup);
function Probe({ enabled }: { enabled: boolean }) {
  const { engine, error, retry } = useCubeEngine(enabled);
  return (
    <div>
      {useEdition()}
      <span>{engine ? 'Ready' : error || 'Idle'}</span>
      <button onClick={retry}>Retry</button>
    </div>
  );
}
it('does not load on informational routes; retries rejection and reuses success', async () => {
  load.mockRejectedValueOnce(new Error('Unavailable')).mockResolvedValueOnce({});
  const view = render(<Probe enabled={false} />);
  expect(load).not.toHaveBeenCalled();
  expect(screen.getByText('global')).toBeVisible();
  view.rerender(
    <EditionProvider edition="club">
      <Probe enabled />
    </EditionProvider>,
  );
  expect(await screen.findByText('Unavailable')).toBeVisible();
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Retry' })));
  expect(await screen.findByText('Ready')).toBeVisible();
  expect(load).toHaveBeenCalledTimes(2);
  view.unmount();
  render(<Probe enabled />);
  expect(await screen.findByText('Ready')).toBeVisible();
  expect(load).toHaveBeenCalledTimes(2);
});
