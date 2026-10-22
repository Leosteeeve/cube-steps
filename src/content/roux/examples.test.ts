import { expect, it } from 'vitest';
import { createCubeEngine } from '../../core/cube';
import { resolveSolveInput } from '../../core/solve-input';
import { validateFacelets } from '../../core/facelets';
import { solveRoux } from '../../methods/roux/solve';
import { ROUX_WORKED_EXAMPLES } from './examples';
import { loadTestRouxAssets, assertCompleteRouxTrace } from '../../../tests/helpers/roux';
it('replays every authored example and actually reaches its advertised rules', async () => {
  const e = await createCubeEngine(), assets = await loadTestRouxAssets();
  expect(ROUX_WORKED_EXAMPLES.length).toBeGreaterThanOrEqual(30);
  for(const example of ROUX_WORKED_EXAMPLES) {
    if(example.input.kind==='facelets') expect(validateFacelets(example.input.facelets,e.solved()).ok, example.id).toBe(true);
    const initial = resolveSolveInput(e,example.input), result=solveRoux(e,initial,assets);
    if(!result.ok) throw Error(example.id+': '+result.message);
    assertCompleteRouxTrace(e,initial,result.trace);
    const stage = result.trace.stages.find(s=>s.id===example.expectedStage)!;
    for(const id of example.expectedRuleIds) expect(stage.actions.some(a=>a.ruleId===id),example.id+' '+id).toBe(true);
    if(example.id.includes('-skip')) expect(stage.status,example.id).toBe('skipped');
  }
},180000);
