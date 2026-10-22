import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../../core/cube';
import type { CubeEngine } from '../../../core/types';
import { generateLsePolicies, serializeLseTables, parseLseTables, lookupLseStep } from './policies';
import { encodeLse } from './coordinates';
import { rouxReferenceState } from '../frame';
let e: CubeEngine;
beforeAll(async () => {
  e = await createCubeEngine();
});
it('admits the whole domain and every stage partition with immutable lookup data', () => {
  const table = generateLsePolicies(e);
  expect(table.domainCount).toBe(184320);
  expect(table.coverage).toEqual({ orientation: 184320, 'left-right': 2880, solved: 96 });
  const bytes = serializeLseTables(table),
    decoded = parseLseTables(bytes);
  const c = encodeLse(e, e.apply(rouxReferenceState(e), ['M', 'U2', "M'", 'U']))!;
  expect(lookupLseStep(decoded, c, 'orientation')).toEqual(lookupLseStep(table, c, 'orientation'));
  bytes.fill(0);
  expect(lookupLseStep(decoded, c, 'orientation')).toEqual(lookupLseStep(table, c, 'orientation'));
  expect(() => parseLseTables(new Uint8Array())).toThrow();
});
