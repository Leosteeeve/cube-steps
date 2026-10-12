import {afterEach,beforeAll,beforeEach,expect,it,vi} from 'vitest';
import {createCubeEngine} from '../core/cube';
import type {CubeEngine,SolveSession} from '../core/types';
import {solveLBL} from '../methods/lbl/solve';
import {createPlaybackController} from './controller';
import {flattenTrace} from '../methods/lbl/trace';
let engine:CubeEngine,session:SolveSession;
beforeAll(async()=>{engine=await createCubeEngine();const moves=['R','U2',"F'"] as const;const result=solveLBL(engine,engine.apply(engine.solved(),moves));if(!result.ok)throw new Error(result.message);session={scrambleMoves:[...moves],trace:result.trace};});
beforeEach(()=>{vi.useFakeTimers();vi.stubGlobal('requestAnimationFrame',(callback:FrameRequestCallback)=>setTimeout(()=>callback(performance.now()),16));vi.stubGlobal('cancelAnimationFrame',clearTimeout);});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
it('steps both ways and seeks exact stage checkpoints',()=>{
 const player=createPlaybackController(engine,session);
 player.step(1);expect(player.snapshot().moveIndex).toBe(1);player.step(-1);
 expect(engine.equals(player.snapshot().boundaryState,session.trace.initial)).toBe(true);
 player.seekStage('top-cross');expect(engine.equals(player.snapshot().boundaryState,session.trace.stages[3].before)).toBe(true);
 player.dispose();
});
it('replays one complete action and cancels obsolete animation after seeking',()=>{
 const player=createPlaybackController(engine,session),flat=flattenTrace(session.trace);
 const i=flat.actions.findIndex(a=>a.action.kind==='algorithm');
 player.replayAction(i);vi.advanceTimersByTime(20000);
 expect(player.snapshot().moveIndex).toBe(flat.actions[i].end);
 expect(player.snapshot().playing).toBe(false);
 player.play();player.seekMove(0);vi.advanceTimersByTime(2000);
 expect(player.snapshot().moveIndex).toBe(0);
 player.play();player.dispose();const end=player.snapshot();vi.advanceTimersByTime(2000);expect(player.snapshot()).toEqual(end);
});
it('uses renderer timing, limits speeds and rejects a mismatched initial setup',()=>{
 const player=createPlaybackController(engine,session),count=flattenTrace(session.trace).moves.length;
 player.setBoundaries(Array.from({length:count+1},(_,i)=>i*800));player.seekMove(2);
 expect(player.snapshot().timestamp).toBe(1600);
 expect(()=>player.setSpeed(0)).toThrow();
 expect(()=>createPlaybackController(engine,{...session,scrambleMoves:[]})).toThrow(/initial/i);
 player.dispose();
});
it('stays complete when there are no moves',()=>{
 const result=solveLBL(engine,engine.solved());if(!result.ok)throw new Error(result.message);
 const player=createPlaybackController(engine,{scrambleMoves:[],trace:result.trace});player.play();
 expect(player.snapshot().currentMove).toBeNull();expect(player.snapshot().playing).toBe(false);player.dispose();
});
