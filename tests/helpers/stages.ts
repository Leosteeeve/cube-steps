import type {CubeEngine,CubeState,StageId} from '../../src/core/types';
import {createTraceBuilder} from '../../src/methods/lbl/trace';
import {solveWhiteCross} from '../../src/methods/lbl/cross';
import {solveFirstLayer} from '../../src/methods/lbl/first-layer';
import {solveMiddleLayer} from '../../src/methods/lbl/middle-layer';
export function firstStages(engine:CubeEngine,initial:CubeState,count:number){
 const trace=createTraceBuilder(engine,initial);
 const stages:[StageId,typeof solveWhiteCross][]=[['white-cross',solveWhiteCross],['first-layer',solveFirstLayer],['middle-layer',solveMiddleLayer]];
 for(const[id,solve]of stages.slice(0,count)){trace.beginStage(id);const result=solve({engine,trace});if(!result.ok)throw new Error(`${id}: ${result.message}`);trace.endStage();}
 return trace.finish();
}
