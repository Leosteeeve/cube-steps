import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { LabRepository } from '../../lab/experiments/repository';
import type { LabRepositorySnapshot } from '../../lab/experiments/types';
const NotebookContext = createContext<{
  repository: LabRepository;
  records: LabRepositorySnapshot;
} | null>(null);
export function LabNotebookProvider({
  getRepository,
  children,
}: {
  getRepository: () => Promise<LabRepository>;
  children: ReactNode;
}) {
  const [value, setValue] = useState<{
      repository: LabRepository;
      records: LabRepositorySnapshot;
    } | null>(null),
    [error, setError] = useState('');
  useEffect(() => {
    let live = true,
      unsubscribe: (() => void) | undefined;
    void getRepository()
      .then((repository) => {
        if (!live) return;
        const update = () => setValue({ repository, records: repository.snapshot() });
        unsubscribe = repository.subscribe(update);
        update();
        void repository.refresh();
      })
      .catch((e) => {
        if (live) setError(String(e));
      });
    return () => {
      live = false;
      unsubscribe?.();
    };
  }, [getRepository]);
  if (error) return <p role="alert">Lab notebook could not open. {error}</p>;
  return value ? (
    <NotebookContext.Provider value={value}>{children}</NotebookContext.Provider>
  ) : (
    <p role="status">Opening the local notebook…</p>
  );
}
export function useLabNotebook() {
  const value = useContext(NotebookContext);
  if (!value) throw Error('Lab notebook provider missing');
  return value;
}
