import { useMemo } from 'react';
import type { CubeEngine, SolveSession, StageId } from '../core/types';
import type { PlaybackSource } from './playback-source';
import { PlaybackView } from './PlaybackView';
import { getMethod } from '../methods/registry';
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
        const stage = getMethod(session.trace.method).stages.find((s) => s.id === id);
        if (stage) onStageChange?.(stage.id);
      }}
    />
  );
}
