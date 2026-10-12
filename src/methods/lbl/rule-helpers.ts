import type {Color,CubeObservation,CubeState,Face,PieceObservation,TeachingMove} from '../../core/types';
import {LBL_ALGORITHMS,type AlgorithmId} from './catalog';
import {pieceSolved} from './stages';
import {RuleError,type LBLContext,type StageResult} from './trace';
export const observation=(c:LBLContext)=>c.engine.observe(c.trace.current);
export function target(c:LBLContext,id:string):PieceObservation {
  const o=observation(c);const p=[...o.edges,...o.corners].find(p=>p.id===id);
  if(!p)throw new RuleError('unsupported-case',c.trace.stageId,`Missing piece ${id}.`);return p;
}
export const solvedTarget=(c:LBLContext,id:string)=>pieceSolved(target(c,id),observation(c));
export function describe(c:LBLContext,id?:string):string {
  if(!id)return 'Inspect the current center colors and working layer.';
  const p=target(c,id);return `The ${Object.values(p.stickers).join('–')} piece is at ${p.slot}: ${Object.entries(p.stickers).map(([f,col])=>`${col} on ${f}`).join(', ')}.`;
}
export function setup(c:LBLContext,moves:TeachingMove[],ruleId:string,explanation:string,id?:string):void {
  if(!moves.length)return;
  const p=id?target(c,id):undefined;
  c.trace.append({kind:moves.every(m=>/^[xyz]/.test(m))?'regrip':'setup',ruleId,caseId:p?.slot??'holding-frame',targets:id?[id]:[],recognition:describe(c,id),explanation,moves});
}
export function algorithm(c:LBLContext,algorithmId:AlgorithmId,ruleId:string,explanation:string,id?:string,repetition?:{group:string;index:number}):void {
  const p=id?target(c,id):undefined;
  c.trace.append({kind:'algorithm',algorithmId,ruleId,caseId:p?.slot??ruleId,targets:id?[id]:[],recognition:describe(c,id),explanation,moves:[...LBL_ALGORITHMS[algorithmId].moves],repetition});
}
export function chooseTurn(c:LBLContext,axis:Face|'y',condition:(o:CubeObservation)=>boolean):TeachingMove[] {
  const choices:TeachingMove[][]=[[],[axis],[`${axis}2`],[`${axis}'`]];
  const result=choices.find(m=>condition(c.engine.observe(c.engine.apply(c.trace.current,m))));
  if(!result)throw new RuleError('unsupported-case',c.trace.stageId,`No ${axis} setup fits the recognized case.`);return result;
}
export function hold(c:LBLContext,color:Color,face:Face):void {
  const choices:TeachingMove[][]=[[],['x'],['x2'],["x'"],['z'],["z'"]];
  const moves=choices.find(m=>c.engine.observe(c.engine.apply(c.trace.current,m)).centers[face]===color);
  if(!moves)throw new RuleError('unsupported-case',c.trace.stageId,'Cannot establish the teaching frame.');
  setup(c,moves,'holding-frame',`Rotate the whole cube so ${color} is on ${face}. Follow this regrip with your physical cube; orbiting the view is different.`);
}
export function runRule(c:LBLContext,run:()=>void):StageResult {
  try{run();return {ok:true,state:c.trace.current};}catch(error){
    if(error instanceof RuleError)return {ok:false,code:error.code,stageId:error.stageId,message:error.message};throw error;
  }
}
export function requireTarget(c:LBLContext,id:string):void {
  if(!solvedTarget(c,id))throw new RuleError('verification',c.trace.stageId,`The ${id} target was not restored to its matching centers.`);
}
export const findPiece=(o:CubeObservation,id:string)=>[...o.edges,...o.corners].find(p=>p.id===id)!;
export function checkpoint(c:LBLContext,id:string,state:CubeState):boolean{return pieceSolved(findPiece(c.engine.observe(state),id),c.engine.observe(state));}
