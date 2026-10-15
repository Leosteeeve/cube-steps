import type { LabRepository } from '../lab/experiments/repository';
import type { TrialMemory } from '../lab/trials/types';
/** App lifetime owner; importing this file neither loads Lab nor opens IndexedDB. */
export function createLabOwner() {
  const trial: TrialMemory = { current: null };
  const beforeUnload = (e: BeforeUnloadEvent) => {
    if (trial.current && trial.current.status !== 'preparing') {
      e.preventDefault();
      e.returnValue = '';
    }
  };
  let observing = false;
  let repository: Promise<LabRepository> | undefined,
    closed = false;
  return {
    trial,
    get() {
      if (!observing && typeof window !== 'undefined') {
        window.addEventListener('beforeunload', beforeUnload);
        observing = true;
      }
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
      if (observing) window.removeEventListener('beforeunload', beforeUnload);
      closed = true;
      void repository?.then(
        (r) => r.dispose(),
        () => {},
      );
    },
  };
}
