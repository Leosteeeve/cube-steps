import { expect, it } from 'vitest';
import { createCubeEngine } from '../../core/cube';
import { buildRouxDiagram } from './diagrams';
import { ROUX_REFERENCE } from './reference';
import { FACELET_LAYOUT } from '../../core/facelet-layout';
it('shows each OCLL execution hold with only the four top corners relevant', async()=>{
  const e=await createCubeEngine();
  const cases=ROUX_REFERENCE.filter(r=>r.id.includes('ocll'));
  expect(cases).toHaveLength(7);
  for(const item of cases) {
    const model=buildRouxDiagram(e,item.exampleState(e),[],'corners');
    expect(model.visible).toHaveLength(12);
    expect(model.visible.every(p=>FACELET_LAYOUT[p.face][p.index].orbit==='CORNERS')).toBe(true);
  }
});
