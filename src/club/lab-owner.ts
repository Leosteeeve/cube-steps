import type { LabRepository } from '../lab/experiments/repository';
/** App lifetime owner; importing this file neither loads Lab nor opens IndexedDB. */
export function createLabOwner() {
  let repository: Promise<LabRepository> | undefined,
    closed = false;
  return {
    get() {
      if (closed) return Promise.reject(Error('Club session closed.'));
      return (repository ??= import('../lab/experiments/repository')
        .then(({ createLabRepository }) => {
          const r = createLabRepository();
          if (closed) r.dispose();
          return r;
        })
        .catch((e) => {
          repository = undefined;
          throw e;
        }));
    },
    dispose() {
      closed = true;
      void repository?.then(
        (r) => r.dispose(),
        () => {},
      );
    },
  };
}
