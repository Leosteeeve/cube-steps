// @vitest-environment jsdom
import { render, cleanup, fireEvent } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { GuidanceProvider, useGuidanceAction, useGuidanceTarget } from './guidance';
afterEach(cleanup);
function Target({ ready = true }: { ready?: boolean }) {
  const ref = useGuidanceTarget('test', ready),
    emit = useGuidanceAction();
  return (
    <button ref={ref} onClick={() => emit({ name: 'test' })}>
      Test
    </button>
  );
}
it('does nothing without a provider', () => {
  const v = render(<Target />);
  fireEvent.click(v.getByText('Test'));
  v.rerender(<Target ready={false} />);
});
it('unregisters replaced targets and forwards real actions', () => {
  const unregister = vi.fn(),
    bridge = {
      registerTarget: vi.fn(() => unregister),
      emit: vi.fn(),
      registerScope: vi.fn(() => () => {}),
    };
  const v = render(
    <GuidanceProvider bridge={bridge}>
      <Target />
    </GuidanceProvider>,
  );
  fireEvent.click(v.getByText('Test'));
  expect(bridge.emit).toHaveBeenCalledWith({ name: 'test' });
  v.rerender(
    <GuidanceProvider bridge={bridge}>
      <Target ready={false} />
    </GuidanceProvider>,
  );
  expect(unregister).toHaveBeenCalledOnce();
  v.unmount();
  expect(unregister).toHaveBeenCalledTimes(2);
});
