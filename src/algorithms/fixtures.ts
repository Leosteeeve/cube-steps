import type { CaseFixture } from './types';
import { CASE_FIXTURES } from './data/fixtures';
export { verifyCaseFixture } from './case-validation';
export function getCaseFixture(id: string): CaseFixture | undefined {
  return CASE_FIXTURES[id];
}
