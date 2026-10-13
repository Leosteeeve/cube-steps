import { useEffect, useState } from 'react';
import type { CaseFixture } from '../../algorithms/types';
export function useFixtures() {
  const [state, setState] = useState<{
    get?: (id: string) => CaseFixture | undefined;
    error?: string;
  }>({});
  useEffect(() => {
    let active = true;
    void import('../../algorithms/fixtures')
      .then((m) => {
        if (active) setState({ get: m.getCaseFixture });
      })
      .catch(() => {
        if (active) setState({ error: 'The case setups could not load. Refresh to try again.' });
      });
    return () => {
      active = false;
    };
  }, []);
  return state;
}
