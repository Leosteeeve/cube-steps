import type { CubeEngine } from '../../core/types';
import type { RouxSearchClient } from '../../roux-lab/client';
import type { RouxRepository } from '../../roux-lab/experiments/repository';
import type { RouxTrialMemory } from '../../roux-lab/trials/types';
/** Importing the club shell loads neither search assets nor an IndexedDB store. */
export function createRouxLabOwner(
  factory: (e: CubeEngine) => Promise<RouxSearchClient> = async (e) =>
    (await import('../../roux-lab/client')).createRouxSearchClient(e),
  repositoryFactory: () => Promise<RouxRepository> = async () =>
    (await import('../../roux-lab/experiments/repository')).createRouxRepository(),
) {
  let client: Promise<RouxSearchClient> | undefined,
    repository: Promise<RouxRepository> | undefined,
    closed = false;
  return {
    trialMemory: { current: null } as RouxTrialMemory,
    getRepository(): Promise<RouxRepository> {
      if (closed) return Promise.reject(Error('Roux Lab is closed.'));
      return (repository ??= repositoryFactory()
        .then((r) => {
          if (closed) {
            r.dispose();
            throw Error('Roux Lab is closed.');
          }
          return r;
        })
        .catch((e) => {
          repository = undefined;
          throw e;
        }));
    },
    getClient(engine: CubeEngine): Promise<RouxSearchClient> {
      if (closed) return Promise.reject(Error('Roux Lab is closed.'));
      return (client ??= factory(engine)
        .then((c) => {
          if (closed) {
            c.dispose();
            throw Error('Roux Lab is closed.');
          }
          return c;
        })
        .catch((e) => {
          client = undefined;
          throw e;
        }));
    },
    dispose() {
      closed = true;
      void repository?.then(
        (r) => r.dispose(),
        () => {},
      );
      void client?.then(
        (c) => c.dispose(),
        () => {},
      );
    },
  };
}
export type RouxLabOwner = ReturnType<typeof createRouxLabOwner>;
