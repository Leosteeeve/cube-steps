import { expect, it } from 'vitest';
import { positionTour } from './position';
it('keeps the bubble inside a narrow visual viewport and docks if needed', () => {
  const target = {
    left: 20,
    right: 340,
    top: 60,
    bottom: 540,
    width: 320,
    height: 480,
  } as DOMRectReadOnly;
  expect(
    positionTour(target, { width: 336, height: 220 }, { left: 0, top: 0, width: 360, height: 640 }),
  ).toEqual({ left: 12, top: 408, placement: 'dock' });
  const p = positionTour(
    target,
    { width: 180, height: 120 },
    { left: 30, top: 20, width: 500, height: 800 },
  );
  expect(p.left).toBeGreaterThanOrEqual(42);
  expect(p.top).toBeGreaterThanOrEqual(32);
  expect(p.left + 180).toBeLessThanOrEqual(518);
  expect(p.top + 120).toBeLessThanOrEqual(808);
});
