import {useEffect,useState} from 'react';
import {createCubeEngine} from '../core/cube';
import type {CubeEngine} from '../core/types';
import {LearnPage} from './LearnPage';
import {SolvePage} from './SolvePage';
export function App(){
 const [route,setRoute]=useState(location.hash||'#/learn/notation'),[engine,setEngine]=useState<CubeEngine|null>(null),[error,setError]=useState('');
 useEffect(()=>{const change=()=>setRoute(location.hash||'#/learn/notation');addEventListener('hashchange',change);void createCubeEngine().then(setEngine).catch(e=>setError(String(e)));return()=>removeEventListener('hashchange',change);},[]);
 const free=route.startsWith('#/solve');
 return <><a className="skip-link" href="#main" onClick={e=>{e.preventDefault();document.getElementById('main')?.focus();}}>Skip to content</a><header className="site-header"><a className="brand" href="#/learn/notation" aria-label="CubeSteps home"><span className="brand-mark" aria-hidden="true"><i/><i/><i/><i/></span>CubeSteps<span className="brand-dot">.</span></a><nav aria-label="Main navigation"><a href="#/learn/notation" className={!free?'selected':''}>Learn the method</a><a href="#/solve" className={free?'selected':''}>Solve a scramble</a></nav><a className="github-link" href="https://github.com/Leosteeeve/cube-steps" target="_blank" rel="noreferrer">Open source <span aria-hidden="true">↗</span></a></header>
  <main id="main" tabIndex={-1}><div className="course-banner"><span className="pill">BEGINNER’S METHOD</span><p>Understand the moves. Enjoy the solve.</p><span className="preview-label">LBL · Local preview</span></div>{error?<p className="error" role="alert">{error}</p>:engine?(free?<SolvePage engine={engine}/>:<LearnPage key={route} engine={engine} lessonId={route.split('/')[2]??'notation'}/>):<p className="loading-panel" role="status">Getting your cube ready…</p>}</main>
  <footer className="site-footer"><p>Small steps. A whole new way to see the cube.</p><span>CubeSteps · Built for curious cubers · MIT</span></footer></>;
}
