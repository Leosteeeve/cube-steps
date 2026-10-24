import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { RouxLabOwner } from './owner';
import type { RouxRepository } from '../../roux-lab/experiments/repository';
import type { RouxRepositorySnapshot } from '../../roux-lab/experiments/types';
const Notebook = createContext<{
  repository: RouxRepository;
  records: RouxRepositorySnapshot;
} | null>(null);
export function RouxNotebookProvider({
  owner,
  children,
}: {
  owner: RouxLabOwner;
  children: ReactNode;
}) {
  const [value, setValue] = useState<{
      repository: RouxRepository;
      records: RouxRepositorySnapshot;
    } | null>(null),
    [error, setError] = useState('');
  useEffect(() => {
    let live = true,
      unsubscribe: (() => void) | undefined;
    void owner.getRepository().then(
      (repository) => {
        if (!live) return;
        const update = () => setValue({ repository, records: repository.snapshot() });
        unsubscribe = repository.subscribe(update);
        update();
        void repository.refresh();
      },
      (e) => {
        if (live) setError(String(e));
      },
    );
    return () => {
      live = false;
      unsubscribe?.();
    };
  }, [owner]);
  return (
    <Notebook.Provider value={value}>
      {error && <p role="alert">Roux notebook could not open: {error}</p>}
      {children}
    </Notebook.Provider>
  );
}
export const useRouxNotebook = () => useContext(Notebook);
