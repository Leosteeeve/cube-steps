// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { expect, it, vi, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
afterEach(cleanup);
import { render, screen } from '@testing-library/react';
import { createCubeEngine } from '../../core/cube';
import { getMethod, getRegisteredRuntime, registerMethodRuntime } from '../../methods/registry';
import { ROUX_RUNTIME } from '../../methods/roux/definition';
vi.mock('../learning/ClubLearnPage', () => ({ ClubLearnPage: () => <p>Roux lesson shell</p> }));
vi.mock('../../app/SolvePage', () => ({ SolvePage: () => <p>Roux solve shell</p> }));
it('registers the runtime before rendering the lazy feature', async () => {
  const { RouxFeaturePage } = await import('./RouxFeaturePage');
  render(
    <RouxFeaturePage
      engine={await createCubeEngine()}
      route={{ kind: 'learn', method: 'roux-beginner', lessonId: 'intro' }}
    />,
  );
  expect(screen.getByText('Roux lesson shell')).toBeVisible();
  expect(getRegisteredRuntime('roux-beginner')).toBe(ROUX_RUNTIME);
  expect(getMethod('roux-beginner').id).toBe('roux-beginner');
  expect(() => registerMethodRuntime(ROUX_RUNTIME)).not.toThrow();
  expect(() => registerMethodRuntime({ ...ROUX_RUNTIME })).toThrow(/registered|conflict/i);
});
