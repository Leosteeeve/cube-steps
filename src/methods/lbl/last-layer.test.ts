import {beforeAll,expect,it} from 'vitest';
import {createCubeEngine} from '../../core/cube';
import type {CubeEngine} from '../../core/types';
import {solveLBL} from './solve';
import {checkStage,piecePositioned,pieceSolved} from './stages';
import {seededScramble} from '../../../tests/fixtures/lbl-cases';
let engine:CubeEngine;beforeAll(async()=>{engine=await createCubeEngine();});
it('covers every last-layer recognition family and permits final-stage disturbance',()=>{
 const edgePatterns=new Set<string>(),corners=new Set<number>(),twists=new Set<number>();let disturbed=false;
 for(let seed=1;seed<=200;seed++){
  const result=solveLBL(engine,engine.apply(engine.solved(),seededScramble(seed)));
  expect(result.ok,`seed ${seed}: ${!result.ok?result.message:''}`).toBe(true);if(!result.ok)continue;
  for(const stage of result.trace.stages){
   const obs=engine.observe(stage.before);
   if(stage.id==='top-cross'){
    const slots=obs.edges.filter(p=>Object.entries(p.stickers).some(([f,c])=>c==='yellow'&&obs.centers[f as keyof typeof obs.centers]==='yellow')).map(p=>p.slot);
    edgePatterns.add(slots.length===2?(slots.every(s=>s.includes('F')||s.includes('B'))||slots.every(s=>s.includes('R')||s.includes('L'))?'line':'L'):String(slots.length));
   }
   if(stage.id==='top-corners')corners.add(obs.corners.filter(p=>Object.values(p.stickers).includes('yellow')&&piecePositioned(p,obs)).length);
   if(stage.id==='corner-orientation'){
    twists.add(obs.corners.filter(p=>!pieceSolved(p,obs)).length);
    disturbed ||= stage.actions.some(a=>!checkStage(engine,a.after,'middle-layer'));
   }
   expect(stage.checkpoint.passed).toBe(true);
  }
  expect(engine.isSolved(result.trace.final)).toBe(true);
 }
 expect([...edgePatterns].sort()).toEqual(['0','4','L','line']);
 expect([...corners].sort()).toEqual([0,1,4]);
 expect(twists.has(2)&&twists.has(3)&&twists.has(4)).toBe(true);
 expect(disturbed).toBe(true);
});
