import type { CubeEngine, CubeState, TraceAction } from '../core/types';
import { describeRouxPlayback, type RouxPlaybackGuidance } from './roux-guidance';
import '../club/roux/roux.css';
export function RouxHoldingGuide({
  model,
  moving,
}: {
  model: RouxPlaybackGuidance;
  moving: boolean;
}) {
  return (
    <section
      className="roux-holding-guide"
      aria-label="Roux reference"
      data-reference={model.reference}
    >
      <p>
        <strong>{model.frameLabel}</strong>
      </p>
      <p aria-label="Middle-slice centers">{model.centerLabel}</p>
      {model.note && <p className="notice">{model.note}</p>}
      {model.protectedIds.length > 0 && (
        <small>{model.protectedIds.length} pieces protected at the declared checkpoint.</small>
      )}
      {moving && <small>Showing the last completed move while the cube turns.</small>}
    </section>
  );
}
export function RouxPlaybackGuide({
  engine,
  boundaryState,
  action,
  completedMoves,
  moving,
}: {
  engine: CubeEngine;
  boundaryState: CubeState;
  action?: TraceAction;
  completedMoves: number;
  moving: boolean;
}) {
  return (
    <RouxHoldingGuide
      model={describeRouxPlayback(engine, boundaryState, action, completedMoves)}
      moving={moving}
    />
  );
}
