import { useEffect, useState } from 'react';
import type { CubeEngine } from '../core/types';
let ready: CubeEngine | null = null;
let pending: Promise<CubeEngine> | null = null;
function loadEngine() {
  return (pending ??= import('../core/cube')
    .then((m) => m.createCubeEngine())
    .then((engine) => (ready = engine)));
}
export function useCubeEngine(enabled: boolean) {
  const [engine, setEngine] = useState<CubeEngine | null>(ready),
    [error, setError] = useState(''),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    setError('');
    void loadEngine()
      .then((e) => {
        if (live) setEngine(e);
      })
      .catch((e) => {
        if (live) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      live = false;
    };
  }, [enabled, attempt]);
  return {
    engine,
    error,
    retry() {
      if (!ready) pending = null;
      setError('');
      setAttempt((n) => n + 1);
    },
  };
}
