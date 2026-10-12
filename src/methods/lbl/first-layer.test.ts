import {beforeAll,expect,it} from 'vitest';
import {createCubeEngine} from '../../core/cube';
import type {CubeEngine} from '../../core/types';
import {checkStage} from './stages';
import {firstStages} from '../../../tests/helpers/stages';
import {seededScramble} from '../../../tests/fixtures/lbl-cases';
import {replayMatchesRecordedStates} from '../../../tests/helpers/trace';
let engine:CubeEngine;beforeAll(async()=>{engine=await createCubeEngine();});
it('inserts twisted and trapped corners while restoring the white cross',()=>{
 const rules=new Set<string>();
 for(let seed=1;seed<=100;seed++){
  const trace=firstStages(engine,engine.apply(engine.solved(),seededScramble(seed)),2);
  expect(checkStage(engine,trace.final,'first-layer'),`seed ${seed}`).toBe(true);
  expect(replayMatchesRecordedStates(engine,trace)).toBe(true);
  trace.stages[1].actions.forEach(a=>rules.add(a.ruleId));
 }
 expect(rules.has('corner-eject')).toBe(true);
 expect(rules.has('corner-insert')).toBe(true);
 expect(firstStages(engine,engine.solved(),2).stages.every(s=>s.status==='skipped')).toBe(true);
});
