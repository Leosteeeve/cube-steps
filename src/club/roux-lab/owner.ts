import type { CubeEngine } from '../../core/types';
import type { RouxSearchClient } from '../../roux-lab/client';
/** Importing the club shell loads neither search assets nor an IndexedDB store. */
export function createRouxLabOwner(
  factory: (e: CubeEngine) => Promise<RouxSearchClient> = async (e) =>
    (await import('../../roux-lab/client')).createRouxSearchClient(e),
) {
  let client: Promise<RouxSearchClient> | undefined,
    closed = false;
  return {
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
      void client?.then(
        (c) => c.dispose(),
        () => {},
      );
    },
  };
}
export type RouxLabOwner = ReturnType<typeof createRouxLabOwner>;
