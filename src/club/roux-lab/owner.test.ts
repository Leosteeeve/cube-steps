import { expect, it, vi } from 'vitest';
import type { CubeEngine } from '../../core/types';
import { createRouxLabOwner } from './owner';
it('opens no notebook on import and disposes a late notebook without touching the client', async () => {
  let resolve!: (v: any) => void;
  const factory = vi.fn(),
    repository = { dispose: vi.fn() },
    make = vi.fn(
      () =>
        new Promise<any>((r) => {
          resolve = r;
        }),
    ),
    owner = createRouxLabOwner(factory, make);
  expect(make).not.toHaveBeenCalled();
  const pending = owner.getRepository();
  owner.dispose();
  resolve(repository);
  await expect(pending).rejects.toThrow(/closed/);
  expect(repository.dispose).toHaveBeenCalledOnce();
  expect(factory).not.toHaveBeenCalled();
});
it('creates no client before use and disposes a client resolved after closure', async () => {
  let resolve!: (v: any) => void;
  const client = { dispose: vi.fn() },
    factory = vi.fn(
      () =>
        new Promise<any>((r) => {
          resolve = r;
        }),
    ),
    owner = createRouxLabOwner(factory);
  expect(factory).not.toHaveBeenCalled();
  const pending = owner.getClient({} as CubeEngine);
  owner.dispose();
  resolve(client);
  await expect(pending).rejects.toThrow(/closed/);
  expect(client.dispose).toHaveBeenCalledOnce();
});
