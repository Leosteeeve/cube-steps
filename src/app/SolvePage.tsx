import {useEffect,useMemo,useRef,useState} from 'react';
import type {CubeEngine,SolveSession,StageId} from '../core/types';
import {parseScramble} from '../core/notation';
import {CubePlayer} from '../player/CubePlayer';
import {createSolveClient} from './solve-client';
import {LessonLayout} from './LessonLayout';
export function SolvePage({engine}:{engine:CubeEngine}){
 const client=useMemo(()=>createSolveClient(),[]),epoch=useRef(0);
 const [text,setText]=useState(''),[session,setSession]=useState<SolveSession|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[randomizing,setRandomizing]=useState(false),[stage,setStage]=useState<StageId>('white-cross'),[active,setActive]=useState<StageId>('white-cross');
 useEffect(()=>()=>{epoch.current++;client.cancel();},[client]);
 function updateText(value:string){epoch.current++;client.cancel();setBusy(false);setRandomizing(false);setText(value);setError('');}
 async function solve(){const token=++epoch.current;setBusy(true);setError('');const result=await client.solveScramble(text);if(token!==epoch.current)return;setBusy(false);if(result.ok){setSession(result.session);setStage('white-cross');setActive('white-cross');}else if(result.error.kind!=='cancelled')setError(`${result.error.offset===undefined?'':`At character ${result.error.offset+1}: `}${result.error.message}`);}
 async function random(){const token=++epoch.current;client.cancel();setBusy(false);setRandomizing(true);setError('');try{const {randomScrambleForEvent}=await import('cubing/scramble');const alg=(await randomScrambleForEvent('333')).toString();if(token!==epoch.current)return;const parsed=parseScramble(alg);if(!parsed.ok)throw new Error('The generated scramble contains unsupported notation. Please try again.');setText(alg);}catch(e){if(token===epoch.current)setError(e instanceof Error?e.message:'Unable to generate a scramble.');}finally{if(token===epoch.current)setRandomizing(false);}}
 return <LessonLayout free selected={active} onSelect={id=>{setStage(id);setActive(id);}}>
  <div className="lesson-heading"><span className="eyebrow">YOUR CUBE. THE SAME METHOD.</span><h1>Every scramble has a story.</h1><p>Get a complete beginner solution, with a reason behind every move.</p></div>
  <form className="scramble-form" onSubmit={e=>{e.preventDefault();void solve();}}>
   <div className="form-top"><label htmlFor="scramble">Scramble sequence</label><button type="button" className="text-button" disabled={randomizing} onClick={()=>void random()}>{randomizing?'Generating…':'Random scramble'} <span aria-hidden="true">↝</span></button></div>
   <textarea id="scramble" value={text} onChange={e=>updateText(e.target.value)} placeholder="R U R' U' F2…" spellCheck={false} rows={2} aria-describedby="scramble-help"/>
   <div className="form-bottom"><p id="scramble-help">Start solved, white up & green front. Use U D L R F B with ′ or 2.<br/>Leave blank to explore an already solved cube.</p><button className="primary-button" type="submit" disabled={busy||randomizing}>{busy?'Finding your steps…':'Explain this solve'} <span aria-hidden="true">→</span></button>{busy&&<button type="button" onClick={()=>{epoch.current++;client.cancel();setBusy(false);}}>Cancel</button>}</div>
  </form>
  {error&&<p className="error" role="alert">{error}{session?' Your previous verified solution remains below.':''}</p>}
  {session?<><div className="solution-summary"><span className="success-dot"/> Verified LBL solution <details><summary>Scramble for this solution</summary><code>{session.scrambleMoves.join(' ')||'Solved cube — no scramble'}</code></details></div><CubePlayer engine={engine} session={session} stage={stage} onStageChange={setActive}/></>:<div className="empty-solve"><div className="empty-cube" aria-hidden="true">▧</div><h2>A clear path from scrambled to solved.</h2><p>Paste the moves you used to scramble your cube, or generate a new scramble. Then follow the same formulas taught in the course.</p><a href="#/learn/notation">New to cube notation? Start here →</a></div>}
 </LessonLayout>;
}
