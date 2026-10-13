import { useMemo } from 'react';
import type { CubeEngine, SolveSession, StageId } from '../core/types';
import type { PlaybackSource } from './playback-source';
import { PlaybackView } from './PlaybackView';
interface Props {
  engine: CubeEngine;
  session: SolveSession;
  stage?: StageId;
  stageRequestId?: number;
  onStageChange?: (id: StageId) => void;
  caseId?: string;
}
export function CubePlayer({
  engine,
  session,
  stage,
  stageRequestId,
  onStageChange,
  caseId,
}: Props) {
  const source = useMemo<PlaybackSource>(() => ({ kind: 'solve', session }), [session]);
  return (
    <PlaybackView
      engine={engine}
      source={source}
      section={stage}
      sectionRequestId={stageRequestId}
      caseId={caseId}
      onSectionChange={(id) => {
        if (id !== 'algorithm-setup' && id !== 'algorithm-formula') onStageChange?.(id);
      }}
    />
  );
}
