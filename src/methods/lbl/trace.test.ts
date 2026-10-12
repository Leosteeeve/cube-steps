import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../../core/cube';
import type { CubeEngine } from '../../core/types';
import { createTraceBuilder, flattenTrace } from './trace';
import { LBL_STAGE_IDS } from './stages';
import { replayMatchesRecordedStates } from '../../../tests/helpers/trace';
let engine:CubeEngine;
beforeAll(async()=>{engine=await createCubeEngine();});
it('retains separate setup actions and independent state snapshots',()=>{
  const builder=createTraceBuilder(engine,engine.solved());
  builder.beginStage('white-cross');
  builder.append({kind:'setup',ruleId:'test-turn',caseId:'undo',targets:['UF'],recognition:'The working face can turn.',explanation:'Turn and undo for this trace fixture.',moves:['U']});
  builder.append({kind:'setup',ruleId:'test-undo',caseId:'undo',targets:['UF'],recognition:'The working face is offset.',explanation:'Restore alignment.',moves:["U'"]});
  builder.endStage();
  for (const id of LBL_STAGE_IDS.slice(1)) {builder.beginStage(id);builder.endStage('Already complete.');}
  const trace=builder.finish();
  expect(flattenTrace(trace).moves).toEqual(['U',"U'"]);
  expect(flattenTrace(trace).actions.map(a=>[a.start,a.end])).toEqual([[0,1],[1,2]]);
  expect(replayMatchesRecordedStates(engine,trace)).toBe(true);
  expect(trace.stages[1].status).toBe('skipped');
});
it('rejects fabricated catalog actions and budget overruns',()=>{
  const builder=createTraceBuilder(engine,engine.solved(),{maxActions:0,maxMoves:0});
  builder.beginStage('white-cross');
  expect(()=>builder.append({kind:'setup',ruleId:'test',caseId:'test',targets:[],recognition:'Test',explanation:'Test',moves:['U']})).toThrow(/budget/i);
});
