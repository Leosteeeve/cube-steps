import { useMemo } from 'react';
import type { CubeEngine } from '../core/types';
import type { AlgorithmDemonstration } from '../algorithms/demonstration';
import type { PlaybackSource } from './playback-source';
import { PlaybackView } from './PlaybackView';
export function AlgorithmPlayer({
  engine,
  demonstration,
}: {
  engine: CubeEngine;
  demonstration: AlgorithmDemonstration;
}) {
  const source = useMemo<PlaybackSource>(
    () => ({ kind: 'algorithm', demonstration }),
    [demonstration],
  );
  return <PlaybackView engine={engine} source={source} />;
}
