import type {TeachingMove} from '../../core/types';
import {checkStage} from './stages';
import {RuleError,type LBLContext,type StageResult} from './trace';
import {algorithm,chooseTurn,findPiece,hold,observation,requireTarget,runRule,setup,solvedTarget,target} from './rule-helpers';
export function solveWhiteCross(c:LBLContext):StageResult{return runRule(c,()=>{
  if(checkStage(c.engine,c.trace.current,'white-cross'))return;
  hold(c,'white','U');
  for(const id of ['UF','UR','UB','UL']){
    if(solvedTarget(c,id))continue;
    const other=Object.values(target(c,id).stickers).find(color=>color!=='white')!;
    setup(c,chooseTurn(c,'y',o=>o.centers.F===other),'cross-face',`Bring the ${other} center to the front so this edge has one clear destination.`,id);
    let piece=target(c,id);
    if(piece.slot.includes('U')){
      const face=piece.slot[1];setup(c,[`${face}2` as TeachingMove],'cross-extract-top','The white edge is in an unfinished top slot. Turn that face twice to bring it to the bottom working layer.',id);
    }else if(!piece.slot.includes('D')){
      const choices=['F',"F'",'R',"R'",'B',"B'",'L',"L'"] as TeachingMove[];
      const move=choices.find(m=>findPiece(c.engine.observe(c.engine.apply(c.trace.current,[m])),id).slot.includes('D'));
      if(!move)throw new RuleError('unsupported-case','white-cross','No middle-edge extraction fits.');
      const inverse=(move.endsWith("'")?move[0]:`${move}'`) as TeachingMove;
      setup(c,[move,'D2',inverse],'cross-extract-middle','Bring the edge down, move it away with D2, then undo the side turn to restore any completed cross edge.',id);
    }
    setup(c,chooseTurn(c,'D',o=>findPiece(o,id).slot==='DF'),'cross-align',`Move the edge below the ${other} front center.`,id);
    setup(c,['F2'],'cross-insert','Turn the front twice to lift this edge into the white cross.',id);
    piece=target(c,id);
    if(piece.stickers.U!=='white')algorithm(c,'cross-flip','cross-flip','The white sticker faces forward. Use the edge flip, keeping the other cross edges in place.',id);
    requireTarget(c,id);
    if(observation(c).centers.U!=='white')throw new RuleError('verification','white-cross','The cross holding frame changed.');
  }
});}
