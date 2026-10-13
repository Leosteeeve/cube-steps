import { expect, it } from 'vitest';
import { admitRegistry } from './admission';
import type { AlgorithmRegistry } from './types';
function fixture(): AlgorithmRegistry {
  const sourceRefs = [
    {
      title: 'Reference',
      url: 'https://www.cubeskills.com/uploads/pdf/tutorials/f2l.pdf',
      reference: 'Basic inserts, first diagram',
    },
  ];
  return {
    cases: {
      'f2l-01': {
        id: 'f2l-01',
        family: 'f2l',
        label: 'F2L 01',
        group: 'basic',
        canonicalSignature: 'test-pattern',
        recognition: 'White faces right.',
        defaultVariantId: 'f2l-01/main/fr',
        variantIds: ['f2l-01/main/fr'],
        fixtureIds: ['f2l-01/a'],
        sourceRefs,
      },
    },
    variants: {
      'f2l-01/main/fr': {
        id: 'f2l-01/main/fr',
        caseId: 'f2l-01',
        startSignature: 'test-pattern',
        targetSlot: 'FR',
        executionPenalty: 0,
        sourceRefs,
        name: 'Insert',
        moves: ['R', 'U', "R'"],
        precondition: 'Pair at front-right.',
        effect: 'Solve this pair.',
        segments: [{ label: 'Insert', start: 0, end: 3 }],
      },
    },
    preparations: {},
  };
}
it('rejects_invalid_registry_references', () => {
  expect(() => admitRegistry(fixture())).not.toThrow();
  const bad: AlgorithmRegistry[] = [];
  let r = fixture();
  bad.push({ ...r, cases: { ...r.cases, duplicate: r.cases['f2l-01'] } });
  r = fixture();
  bad.push({ ...r, variants: { ...r.variants, duplicate: r.variants['f2l-01/main/fr'] } });
  r = fixture();
  r.cases['f2l-01'].defaultVariantId = 'missing';
  bad.push(r);
  r = fixture();
  r.variants['f2l-01/main/fr'].caseId = 'oll-01';
  bad.push(r);
  r = fixture();
  r.variants['f2l-01/main/fr'].segments = [{ label: 'Gap', start: 1, end: 3 }];
  bad.push(r);
  r = fixture();
  r.variants['f2l-01/main/fr'].moves = ['r' as never];
  bad.push(r);
  r = fixture();
  r.cases['f2l-01'].variantIds = [];
  bad.push(r);
  r = fixture();
  r.variants['f2l-01/main/fr'].startSignature = '';
  bad.push(r);
  for (const invalid of bad) expect(() => admitRegistry(invalid)).toThrow();
});
