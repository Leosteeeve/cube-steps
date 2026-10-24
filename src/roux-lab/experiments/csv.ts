import type { RouxAttempt } from './types';
import { assertAttempt } from './schema';
import { csvCell } from '../../shared/csv';
export function exportRouxCsv(attempts: readonly RouxAttempt[]): string {
  const columns = [
    'id',
    'experimentId',
    'routeId',
    'testerId',
    'timingMethod',
    'endpoint',
    'kind',
    'outcome',
    'rawMs',
    'flow',
    'recognition',
    'note',
    'revision',
    'deletedAt',
  ] as const;
  return [
    columns.join(','),
    ...attempts.map((a) => {
      assertAttempt(a);
      return columns.map((k) => csvCell(a[k])).join(',');
    }),
  ].join('\r\n');
}
