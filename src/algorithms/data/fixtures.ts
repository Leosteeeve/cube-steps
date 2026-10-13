import type { CaseFixture } from '../types';
import data from './case-fixtures.json';
export const CASE_FIXTURES: Readonly<Record<string, CaseFixture>> = data as Record<
  string,
  CaseFixture
>;
