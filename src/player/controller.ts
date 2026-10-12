import type { CubeEngine, CubeState, SolveSession, StageId, TeachingMove } from '../core/types';
import { createTimeline } from './timeline';
export interface PlaybackSnapshot {
  moveIndex: number;
  currentMove: TeachingMove | null;
  progress: number;
  actionIndex: number;
  stageId: StageId;
  boundaryState: CubeState;
  timestamp: number;
  speed: number;
  playing: boolean;
  total: number;
}
export function createPlaybackController(engine: CubeEngine, session: SolveSession) {
  if (!engine.equals(engine.apply(engine.solved(), session.scrambleMoves), session.trace.initial))
    throw new Error('The initial scramble does not match this trace.');
  const timeline = createTimeline(engine, session.trace),
    count = timeline.moves.length;
  let boundaries = Array.from({ length: count + 1 }, (_, i) => i * 1000),
    timestamp = 0,
    speed = 1,
    playing = false,
    disposed = false,
    frame = 0,
    generation = 0,
    stopAt = count,
    selectedStage: StageId | undefined;
  const listeners = new Set<(s: PlaybackSnapshot) => void>();
  function snapshot(): PlaybackSnapshot {
    let index = 0;
    while (index < count && timestamp >= boundaries[index + 1]) index++;
    const actionIndex = timeline.actions.findIndex((a) => index >= a.start && index < a.end);
    return {
      moveIndex: index,
      currentMove: timeline.moves[index] ?? null,
      progress:
        index < count
          ? (timestamp - boundaries[index]) / (boundaries[index + 1] - boundaries[index])
          : 0,
      actionIndex,
      stageId: selectedStage ?? timeline.actions[actionIndex]?.stageId ?? 'corner-orientation',
      boundaryState: timeline.states[index],
      timestamp,
      speed,
      playing,
      total: count,
    };
  }
  function emit() {
    if (!disposed) {
      const s = snapshot();
      listeners.forEach((fn) => fn(s));
    }
  }
  function pause() {
    playing = false;
    generation++;
    cancelAnimationFrame(frame);
    emit();
  }
  function seekMove(index: number) {
    pause();
    selectedStage = undefined;
    timestamp = boundaries[Math.min(count, Math.max(0, Math.round(index)))];
    stopAt = count;
    emit();
  }
  function play() {
    if (disposed || count === 0 || playing) return;
    if (timestamp >= boundaries[count]) seekMove(0);
    selectedStage = undefined;
    playing = true;
    const token = ++generation;
    let previous = performance.now();
    emit();
    const tick = (now: number) => {
      if (disposed || !playing || token !== generation) return;
      timestamp = Math.min(boundaries[stopAt], timestamp + (now - previous) * speed);
      previous = now;
      if (timestamp >= boundaries[stopAt]) playing = false;
      emit();
      if (playing) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
  }
  return {
    timeline,
    snapshot,
    play,
    pause,
    seekMove,
    step(direction: -1 | 1) {
      const s = snapshot();
      seekMove(s.moveIndex + (direction === -1 && s.progress > 0 ? 0 : direction));
    },
    replayAction(index: number) {
      const range = timeline.actions[index];
      if (!range) return;
      seekMove(range.start);
      stopAt = range.end;
      play();
    },
    seekStage(id: StageId) {
      const range = timeline.stages.find((s) => s.id === id);
      if (!range) return;
      seekMove(range.start);
      selectedStage = id;
      emit();
    },
    setSpeed(value: number) {
      if (![0.25, 0.5, 1, 2].includes(value)) throw new Error('Unsupported playback speed.');
      speed = value;
      emit();
    },
    setBoundaries(values: number[]) {
      if (
        values.length !== count + 1 ||
        values[0] !== 0 ||
        values.some((v, i) => i > 0 && v <= values[i - 1])
      )
        throw new Error('Invalid renderer timeline.');
      const index = snapshot().moveIndex;
      pause();
      boundaries = [...values];
      timestamp = boundaries[index];
      emit();
    },
    subscribe(listener: (s: PlaybackSnapshot) => void) {
      listeners.add(listener);
      listener(snapshot());
      return () => {
        listeners.delete(listener);
      };
    },
    dispose() {
      playing = false;
      disposed = true;
      generation++;
      cancelAnimationFrame(frame);
      listeners.clear();
    },
  };
}
export type PlaybackController = ReturnType<typeof createPlaybackController>;
