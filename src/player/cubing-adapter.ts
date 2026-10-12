import {TwistyPlayer,type ExperimentalLeafIndex,type ExperimentalMillisecondTimestamp} from 'cubing/twisty';
import type {SolveSession} from '../core/types';
import {EDGE_SLOTS,CORNER_SLOTS} from '../core/observations';
import {flattenTrace} from '../methods/lbl/trace';
export async function createCubingAdapter(host:HTMLElement,session:SolveSession){
 const probe=document.createElement('canvas');const gl=probe.getContext('webgl2');
 if(!gl)throw new Error('3D rendering is unavailable. You can still read and step through every move.');
 gl.getExtension('WEBGL_lose_context')?.loseContext();
 const flat=flattenTrace(session.trace);
 const player=new TwistyPlayer({puzzle:'3x3x3',alg:flat.moves.join(' '),experimentalSetupAlg:session.scrambleMoves.join(' '),experimentalSetupAnchor:'start',controlPanel:'none',background:'none',hintFacelets:'none',viewerLink:'none',cameraLatitude:28,cameraLongitude:32,experimentalDragInput:'auto'});
 player.indexer='simple';player.timestamp=0 as ExperimentalMillisecondTimestamp;player.style.width='100%';player.style.height='100%';
 host.replaceChildren(player);
 const indexer=await player.experimentalModel.indexer.get();
 const boundaries:number[]=flat.moves.map((_,i)=>indexer.indexToMoveStartTimestamp(i as ExperimentalLeafIndex));boundaries.push(indexer.algDuration());
 let lastTargets='';
 return {
  boundaries,
  setTimestamp(time:number){player.timestamp=time as ExperimentalMillisecondTimestamp;},
  highlight(targets:string[]){
   const key=targets.join(',');if(key===lastTargets)return;lastTargets=key;
   const orbit=(slots:string[],faces:number)=>({pieces:slots.map(id=>({facelets:Array(faces).fill(targets.length===0||targets.includes(id)?'regular':'dim')}))});
   player.experimentalStickeringMaskOrbits={orbits:{EDGES:orbit(EDGE_SLOTS,2),CORNERS:orbit(CORNER_SLOTS,3),CENTERS:{pieces:Array.from({length:6},()=>({facelets:['regular']}))}}};
  },
  dispose(){player.pause();player.remove();},
 };
}
