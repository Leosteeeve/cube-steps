// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { expect, it, vi, afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';
afterEach(cleanup);
import { render, screen, fireEvent } from '@testing-library/react';
import { createCubeEngine } from '../../core/cube';
import { getMethod, getRegisteredRuntime, registerMethodRuntime } from '../../methods/registry';
import { ROUX_RUNTIME } from '../../methods/roux/definition';
import { prepareRouxPlayback } from '../../methods/roux/browser-runtime';
vi.mock('../../methods/roux/browser-runtime', () => ({ prepareRouxPlayback: vi.fn() }));
beforeEach(() =>
  vi
    .mocked(prepareRouxPlayback)
    .mockReset()
    .mockImplementation(async () => {
      registerMethodRuntime(ROUX_RUNTIME);
      return ROUX_RUNTIME;
    }),
);
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
  expect(screen.getByRole('status')).toHaveTextContent('Loading Beginner Roux');
  expect(await screen.findByText('Roux lesson shell')).toBeVisible();
  expect(getRegisteredRuntime('roux-beginner')).toBe(ROUX_RUNTIME);
  expect(getMethod('roux-beginner').id).toBe('roux-beginner');
  expect(() => registerMethodRuntime(ROUX_RUNTIME)).not.toThrow();
  expect(() => registerMethodRuntime({ ...ROUX_RUNTIME })).toThrow(/registered|conflict/i);
});
it('keeps a failed asset load recoverable before opening the lesson', async () => {
  vi.mocked(prepareRouxPlayback).mockRejectedValueOnce(Error('Roux assets offline'));
  const { RouxFeaturePage } = await import('./RouxFeaturePage');
  render(
    <RouxFeaturePage
      engine={await createCubeEngine()}
      route={{ kind: 'learn', method: 'roux-beginner', lessonId: 'intro' }}
    />,
  );
  expect(await screen.findByRole('alert')).toHaveTextContent('Roux assets offline');
  expect(screen.queryByText('Roux lesson shell')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Retry loading Roux' }));
  expect(await screen.findByText('Roux lesson shell')).toBeVisible();
});
