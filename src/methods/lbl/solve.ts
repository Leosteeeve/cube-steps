import type {CubeEngine,CubeState,SolveLimits,SolveResult} from '../../core/types';
import {createTraceBuilder,flattenTrace,RuleError} from './trace';
import {checkStage,LBL_STAGE_IDS} from './stages';
import {solveWhiteCross} from './cross';
import {solveFirstLayer} from './first-layer';
import {solveMiddleLayer} from './middle-layer';
import {solveCornerOrientation,solveTopCorners,solveTopCross,solveTopEdges} from './last-layer';
export function solveLBL(engine:CubeEngine,initial:CubeState,options?:SolveLimits):SolveResult {
 const trace=createTraceBuilder(engine,initial,options);
 const rules=[solveWhiteCross,solveFirstLayer,solveMiddleLayer,solveTopCross,solveTopEdges,solveTopCorners,solveCornerOrientation];
 try{
  for(let i=0;i<LBL_STAGE_IDS.length;i++){
   const id=LBL_STAGE_IDS[i];trace.beginStage(id);
   const result=rules[i]({engine,trace});if(!result.ok)return result;
   trace.endStage();
  }
  const result=trace.finish();let replay=initial;
  for(const stage of result.stages){
   for(const action of stage.actions){
    if(!engine.equals(replay,action.before))throw new RuleError('verification',stage.id,'Trace starting state mismatch.');
    replay=engine.apply(replay,action.moves);
    if(!engine.equals(replay,action.after)||!action.checkpoint.passed)throw new RuleError('verification',stage.id,'Trace action checkpoint mismatch.');
   }
   if(!checkStage(engine,replay,stage.id))throw new RuleError('verification',stage.id,'Stage replay did not reach its goal.');
  }
  if(!engine.isSolved(replay)||!engine.equals(engine.apply(initial,flattenTrace(result).moves),result.final))throw new RuleError('verification','corner-orientation','The replay did not solve the cube.');
  return {ok:true,trace:result};
 }catch(error){
  if(error instanceof RuleError)return {ok:false,code:error.code,stageId:error.stageId,message:error.message};
  return {ok:false,code:'verification',stageId:trace.stageId,message:error instanceof Error?error.message:'Unexpected teaching rule failure.'};
 }
}
