import { expect,it } from 'vitest';
import { createTimerState,transitionTimer,type TimerInput,type TimerEffect } from './machine';
import type { PreparedScramble,Interruption } from './types';
const prepared={id:'attempt-1',text:"R U R'",state:{data:{}},facelets:{}} as PreparedScramble;
function driver(inspectionEnabled=false) {
  let state=createTimerState({version:1,inspectionEnabled});const effects:TimerEffect[]=[];
  const send=(input:TimerInput,atMs:number,wallTime='2026-10-13T08:00:00.000Z')=>{const result=transitionTimer(state,{...input,atMs,wallTime});state=result.state;effects.push(...result.effects);return result.effects};
  send({type:'scramble-ready',prepared},0);
  return {send,effects,get state(){return state}};
}
it('arms at 300ms, cancels at 299ms and measures from monotonic timestamps',()=>{
  const d=driver();d.send({type:'down',token:'keyboard'},100);d.send({type:'down',token:'keyboard',repeat:true},200);d.send({type:'up',token:'keyboard'},399);expect(d.state.phase).toBe('idle');
  d.send({type:'down',token:'keyboard'},500);d.send({type:'up',token:'keyboard'},800);expect(d.state.phase).toBe('running');
  d.send({type:'tick'},1000,'1900-01-01T00:00:00.000Z');const effects=d.send({type:'down',token:'keyboard'},10800,'2100-01-01T00:00:00.000Z');
  expect(effects).toHaveLength(1);expect(effects[0]).toMatchObject({type:'record',attempt:{rawMs:10000,scramble:prepared.text,id:prepared.id,createdAt:'2100-01-01T00:00:00.000Z'}});
  d.send({type:'down',token:'keyboard',repeat:true},11000);d.send({type:'up',token:'pointer:5'},11010);expect(d.effects.filter(e=>e.type==='next-scramble')).toHaveLength(0);
  d.send({type:'up',token:'keyboard'},11020);d.send({type:'up',token:'keyboard'},11030);expect(d.state.phase).toBe('loading');expect(d.effects.filter(e=>e.type==='record')).toHaveLength(1);expect(d.effects.filter(e=>e.type==='next-scramble')).toHaveLength(1);
});
it.each([[14999,'none'],[15000,'plus2'],[16999,'plus2'],[17000,'dnf']] as const)('assesses inspection at actual release %d', (elapsed,penalty)=>{
  const d=driver(true);d.send({type:'down',token:'keyboard'},0);d.send({type:'up',token:'keyboard'},20);expect(d.state.phase).toBe('inspection');
  d.send({type:'down',token:'keyboard'},elapsed+20-500);d.send({type:'up',token:'keyboard'},elapsed+20);expect(d.state).toMatchObject({phase:'running',inspectionMs:elapsed,inspectionPenalty:penalty});
  const effects=d.send({type:'down',token:'pointer:1'},elapsed+1020);expect(effects[0]).toMatchObject({type:'record',attempt:{rawMs:1000,inspectionMs:elapsed,inspectionPenalty:penalty}});
});
it('keeps the original inspection after an early release and freezes settings',()=>{
  const d=driver(true);d.send({type:'down',token:'keyboard'},0);d.send({type:'up',token:'keyboard'},10);
  d.send({type:'down',token:'keyboard'},1000);d.send({type:'up',token:'keyboard'},1100);expect(d.state).toMatchObject({phase:'inspection',inspectionStartedAt:10});
  d.send({type:'settings',settings:{version:1,inspectionEnabled:false}},1200);
  d.send({type:'down',token:'keyboard'},14800);d.send({type:'up',token:'keyboard'},15100);expect(d.state).toMatchObject({phase:'running',inspectionMs:15090,inspectionPenalty:'plus2'});
  d.send({type:'scramble-ready',prepared:{...prepared,id:'stale'}},16000);expect(d.state).toMatchObject({prepared:{id:prepared.id}});
});
it('ignores mixed releases, repeated downs and unsupported synthetic click events',()=>{
  const d=driver();d.send({type:'down',token:'pointer:1'},0);d.send({type:'down',token:'pointer:2'},100);d.send({type:'up',token:'pointer:2'},400);expect(d.state.phase).toBe('arming');
  d.send({type:'up',token:'pointer:1'},500);expect(d.state.phase).toBe('running');
  d.send({type:'down',token:'keyboard',repeat:true},600);d.send({type:'click'} as unknown as TimerInput,650);expect(d.state.phase).toBe('running');
  d.send({type:'down',token:'pointer:1'},900);d.send({type:'down',token:'keyboard'},901);d.send({type:'up',token:'keyboard'},902);expect(d.state.phase).toBe('stopped');
  d.send({type:'pointer-cancel'},903);expect(d.state.phase).toBe('loading');expect(d.effects.filter(e=>e.type==='record')).toHaveLength(1);
});
it.each(['escape','blur','hidden','leave','pointer-cancel'] as Interruption[])('cancels before start and records one interruption DNF while running: %s',type=>{
  const d=driver(true);d.send({type:'down',token:'keyboard'},0);d.send({type:'up',token:'keyboard'},10);d.send({type},100);expect(d.state.phase).toBe('idle');expect(d.effects).toEqual([]);
  const run=driver();run.send({type:'down',token:'keyboard'},0);run.send({type:'up',token:'keyboard'},300);run.send({type},1300);run.send({type},1400);
  expect(run.state.phase).toBe('loading');expect(run.effects).toHaveLength(2);expect(run.effects[0]).toMatchObject({type:'record',attempt:{rawMs:1000,interruption:type,manualPenalty:'none'}});
  const arm=driver();arm.send({type:'down',token:'pointer:2'},0);arm.send({type},100);arm.send({type:'up',token:'pointer:2'},400);expect(arm.state.phase).toBe('idle');expect(arm.effects).toEqual([]);
});
it('disables input until ready, preserves the completed result on errors and prevents immediate ID reuse',()=>{
  let state=createTimerState({version:1,inspectionEnabled:false});
  state=transitionTimer(state,{type:'down',token:'keyboard',atMs:0,wallTime:''}).state;expect(state.phase).toBe('loading');
  const d=driver();d.send({type:'down',token:'keyboard'},0);d.send({type:'up',token:'keyboard'},300);d.send({type:'down',token:'keyboard'},400);d.send({type:'up',token:'keyboard'},500);d.send({type:'scramble-error',message:'offline'},600);
  expect(d.state).toMatchObject({phase:'error',lastAttempt:{id:prepared.id,rawMs:100}});
  d.send({type:'scramble-loading'},700);d.send({type:'scramble-ready',prepared},800);expect(d.state.phase).not.toBe('idle');
});
