import type { CubeEngine,CubeState,SolveFailure,SolveLimits,SolveTrace,StageId,TraceAction,TraceStage,TeachingMove } from '../../core/types';
import { LBL_ALGORITHMS, type AlgorithmId } from './catalog';
import { checkStage } from './stages';
export class RuleError extends Error {
  constructor(public code:SolveFailure['code'],public stageId:StageId,message:string){super(message);}
}
export type ActionInput=Omit<TraceAction,'before'|'after'|'checkpoint'> & {check?:{id:string;description:string;test:(state:CubeState)=>boolean}};
export interface TraceBuilder {
  readonly current:CubeState; readonly stageId:StageId;
  beginStage(id:StageId):void; append(input:ActionInput):CubeState;
  endStage(reasonIfSkipped?:string):void; finish():SolveTrace;
}
export interface LBLContext {engine:CubeEngine;trace:TraceBuilder}
export type StageResult={ok:true;state:CubeState}|SolveFailure;
export function createTraceBuilder(engine:CubeEngine,initial:CubeState,limits:SolveLimits={maxActions:512,maxMoves:4096}):TraceBuilder {
  let current=initial, stage:TraceStage|undefined, actions=0,moves=0;
  const stages:TraceStage[]=[];
  const seen=new Set<string>();
  return {
    get current(){return current;},
    get stageId(){return stage?.id??'white-cross';},
    beginStage(id){stage={id,status:'completed',actions:[],before:current,after:current,checkpoint:{id,description:'Stage goal reached.',passed:false}};seen.clear();},
    append(input){
      if(!stage)throw new Error('Open a stage before adding actions.');
      if(++actions>limits.maxActions||(moves+=input.moves.length)>limits.maxMoves)throw new RuleError('budget',stage.id,'Teaching move budget exceeded.');
      if(input.kind==='algorithm'){
        const alg=LBL_ALGORITHMS[input.algorithmId as AlgorithmId];
        if(!alg||alg.moves.join(' ')!==input.moves.join(' '))throw new RuleError('verification',stage.id,'Algorithm moves do not match the shared catalog.');
      }
      const key=JSON.stringify([input.ruleId,input.targets,current.data]);
      if(seen.has(key))throw new RuleError('loop',stage.id,'A teaching rule repeated without progress.');
      seen.add(key);
      const before=current,after=engine.apply(current,input.moves);
      const {check,...metadata}=input;
      const checkpoint=check?{id:check.id,description:check.description,passed:check.test(after)}:{id:'applied-moves',description:'The displayed moves have been applied in the current holding frame.',passed:true};
      if(!checkpoint.passed)throw new RuleError('verification',stage.id,checkpoint.description);
      current=after;stage.actions.push({...metadata,before,after,checkpoint});return current;
    },
    endStage(reason){
      if(!stage)throw new Error('No active stage.');
      stage.after=current;stage.checkpoint.passed=checkStage(engine,current,stage.id);
      if(!stage.checkpoint.passed)throw new RuleError('verification',stage.id,'The stage goal was not reached.');
      if(stage.actions.length===0){stage.status='skipped';stage.skipReason=reason??'The pieces for this stage already meet the goal.';}
      stages.push(stage);stage=undefined;
    },
    finish(){if(stage)throw new Error('Close the active stage first.');return {method:'lbl',initial,stages,final:current};},
  };
}
export interface ActionRange {action:TraceAction;stageId:StageId;start:number;end:number}
export interface FlatTrace {moves:TeachingMove[];actions:ActionRange[];stages:{id:StageId;start:number;end:number}[]}
export function flattenTrace(trace:SolveTrace):FlatTrace {
  const result:FlatTrace={moves:[],actions:[],stages:[]};
  for(const stage of trace.stages){
    const start=result.moves.length;
    for(const action of stage.actions){const start=result.moves.length;result.moves.push(...action.moves);result.actions.push({action,stageId:stage.id,start,end:result.moves.length});}
    result.stages.push({id:stage.id,start,end:result.moves.length});
  }
  return result;
}
