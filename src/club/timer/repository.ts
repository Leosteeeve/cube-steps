import { isTimerAttempt, openTimerStore, type TimerStore, type DeleteToken } from './storage';
import type { Penalty, TimerAttempt } from './types';
export interface RepositorySnapshot { attempts: TimerAttempt[]; pendingIds: string[]; error: string }
export interface TimerRepository {
  record(attempt: TimerAttempt): Promise<void>; retry(id: string): Promise<void>;
  snapshot(): RepositorySnapshot; refresh(): Promise<void>;
  subscribe(listener: (snapshot: RepositorySnapshot) => void): () => void;
  updatePenalty(id: string, revision: number, penalty: Penalty): Promise<TimerAttempt>;
  softDelete(id: string, revision: number, deletedAt: string): Promise<DeleteToken>;
  undoDelete(token: DeleteToken): Promise<boolean>; dispose(): void;
}
export function createTimerRepository(open: () => Promise<TimerStore> = openTimerStore): TimerRepository {
  const pending = new Map<string,TimerAttempt>(), saved = new Map<string,TimerAttempt>(), writing = new Map<string,Promise<void>>();
  const listeners = new Set<(s:RepositorySnapshot)=>void>(), operations = new Set<Promise<unknown>>();
  let connection: Promise<TimerStore> | undefined, closed = false, error = '', invalidCount = 0, epoch = 0;
  const channel = typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('cubesteps.club.timer.v1') : null;
  const connect = () => connection ??= open().catch(e=>{connection=undefined;throw e});
  const snapshot = ():RepositorySnapshot => ({ attempts: [...new Map([...saved,...pending]).values()].map(a=>({...a})), pendingIds:[...pending.keys()], error: error || (invalidCount ? `${invalidCount} incompatible record(s) were preserved and excluded.` : '') });
  const emit = () => { const s=snapshot();for(const listener of listeners)listener(s); };
  function track<T>(promise:Promise<T>):Promise<T> { operations.add(promise);void promise.then(()=>operations.delete(promise),()=>operations.delete(promise));return promise; }
  function resetClosedConnection(e: unknown) {
    if (e instanceof Error && e.name === 'InvalidStateError') { void connection?.then(s=>s.close(),()=>{}); connection=undefined; }
  }
  const refresh = ():Promise<void> => {
    if(closed)return Promise.resolve(); const requestEpoch=++epoch;
    return track((async()=>{try{const data=await (await connect()).list();if(requestEpoch!==epoch)return;saved.clear();data.attempts.forEach(a=>saved.set(a.id,a));invalidCount=data.invalidCount;if(!pending.size)error='';emit();}catch(e){resetClosedConnection(e);if(requestEpoch===epoch){error=`History unavailable. ${e instanceof Error?e.message:String(e)}`;emit();}}})());
  };
  function retry(id:string):Promise<void> {
    if(writing.has(id))return writing.get(id)!;const attempt=pending.get(id);if(!attempt||closed)return Promise.resolve();
    const work=track((async()=>{
      try { await (await connect()).add(attempt);++epoch;pending.delete(id);saved.set(id,attempt);error=pending.size?'Not saved: retry the remaining attempts.':'';if(!closed)channel?.postMessage('changed'); }
      catch(e) { resetClosedConnection(e);error=`Not saved. ${e instanceof Error?e.message:String(e)}`; }
      finally { writing.delete(id);emit(); }
    })());writing.set(id,work);return work;
  }
  async function mutate<T>(operation:(store:TimerStore)=>Promise<T>):Promise<T> {
    if(closed)throw new Error('History is closed.');
    return track((async()=>{try{const result=await operation(await connect());++epoch;await refresh();if(!closed)channel?.postMessage('changed');return result;}catch(e){resetClosedConnection(e);await refresh();error=e instanceof Error?e.message:String(e);emit();throw e;}})());
  }
  const onMessage=()=>{void refresh()};if(channel)channel.onmessage=onMessage;
  if(typeof window!=='undefined')window.addEventListener('focus',onMessage);
  return {
    snapshot,refresh,retry,
    record(attempt){if(!isTimerAttempt(attempt))return Promise.reject(new Error('Invalid timer attempt.'));if(pending.has(attempt.id)||saved.has(attempt.id))return writing.get(attempt.id)??Promise.resolve();pending.set(attempt.id,{...attempt});++epoch;emit();return retry(attempt.id);},
    subscribe(listener){listeners.add(listener);return()=>{listeners.delete(listener)};},
    updatePenalty:(id,revision,penalty)=>mutate(s=>s.updatePenalty(id,revision,penalty)),
    softDelete:(id,revision,at)=>mutate(s=>s.softDelete(id,revision,at)),
    undoDelete:(token)=>mutate(s=>s.undoDelete(token)),
    dispose(){if(closed)return;closed=true;channel?.close();if(typeof window!=='undefined')window.removeEventListener('focus',onMessage);listeners.clear();void Promise.allSettled([...operations]).then(async()=>{try{(await connection)?.close()}catch{/* failed open has no connection */}});},
  };
}
