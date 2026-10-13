import type { CubeEngine, CubeState, SolveSession, StageId, TeachingMove } from '../core/types';
import { createPlaybackTimeline } from './playback-timeline';
import type { PlaybackSource, PlaybackSectionId } from './playback-source';
import type { AdvancedAssets } from '../methods/advanced/assets';

export interface SourcePlaybackSnapshot {
  moveIndex: number;
  currentMove: TeachingMove | null;
  progress: number;
  actionIndex: number;
  sectionId: PlaybackSectionId;
  boundaryState: CubeState;
  timestamp: number;
  speed: number;
  playing: boolean;
  total: number;
}
export function createSourcePlaybackController(
  engine: CubeEngine,
  source: PlaybackSource,
  assets?: AdvancedAssets,
) {
  const timeline = createPlaybackTimeline(engine, source, assets),
    count = timeline.moves.length;
  let boundaries = Array.from({ length: count + 1 }, (_, i) => i * 1000),
    timestamp = 0,
    speed = 1,
    playing = false,
    disposed = false,
    frame = 0,
    generation = 0,
    stopAt = count,
    selectedSection: PlaybackSectionId | undefined;
  const listeners = new Set<(s: SourcePlaybackSnapshot) => void>();
  function snapshot(): SourcePlaybackSnapshot {
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
      sectionId:
        selectedSection ?? timeline.actions[actionIndex]?.sectionId ?? timeline.sections.at(-1)!.id,
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
    selectedSection = undefined;
    timestamp = boundaries[Math.min(count, Math.max(0, Math.round(index)))];
    stopAt = count;
    emit();
  }
  function play() {
    if (disposed || count === 0 || playing) return;
    if (timestamp >= boundaries[count]) seekMove(0);
    if (timestamp >= boundaries[stopAt]) stopAt = count;
    selectedSection = undefined;
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
    seekSection(id: PlaybackSectionId) {
      const range = timeline.sections.find((s) => s.id === id);
      if (!range) return;
      seekMove(range.start);
      selectedSection = id;
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
    subscribe(listener: (s: SourcePlaybackSnapshot) => void) {
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
export type SourcePlaybackController = ReturnType<typeof createSourcePlaybackController>;
export type PlaybackSnapshot = Omit<SourcePlaybackSnapshot, 'sectionId'> & { stageId: StageId };
export function createPlaybackController(
  engine: CubeEngine,
  session: SolveSession,
  assets?: AdvancedAssets,
) {
  const player = createSourcePlaybackController(engine, { kind: 'solve', session }, assets);
  const legacy = (s: SourcePlaybackSnapshot): PlaybackSnapshot => {
    const { sectionId, ...rest } = s;
    return { ...rest, stageId: sectionId as StageId };
  };
  return {
    ...player,
    timeline: {
      ...player.timeline,
      stages: player.timeline.sections,
      actions: player.timeline.actions.map(({ sectionId, ...a }) => ({
        ...a,
        stageId: sectionId as StageId,
      })),
    },
    snapshot: () => legacy(player.snapshot()),
    subscribe: (listener: (s: PlaybackSnapshot) => void) =>
      player.subscribe((s) => listener(legacy(s))),
    seekStage: (id: StageId) => player.seekSection(id),
  };
}
export type PlaybackController = ReturnType<typeof createPlaybackController>;
