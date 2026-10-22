import type { CubeEngine, CubeState, TraceAction } from '../core/types';
import { observeRouxFrame } from '../methods/roux/frame';
export interface RouxPlaybackGuidance {
  frameLabel: string;
  centerLabel: string;
  reference: 'ready' | 'setup-required';
  note?: string;
  protectedIds: readonly string[];
}
export function describeRouxPlayback(
  engine: CubeEngine,
  boundaryState: CubeState,
  action: TraceAction | undefined,
  completedMoves: number,
): RouxPlaybackGuidance {
  const centers = engine.observe(boundaryState).centers;
  const centerLabel = `${centers.U} up · ${centers.F} front · ${centers.D} down · ${centers.B} back`;
  const fixed = centers.L === 'blue' && centers.R === 'green';
  if (!fixed)
    return {
      frameLabel: 'Follow the starting hold: blue left · green right',
      centerLabel,
      reference: 'setup-required',
      note: 'Follow the visible x2 y regrip before using the Roux frame. Camera movement is only for looking.',
      protectedIds: [],
    };
  const frame = observeRouxFrame(engine, boundaryState),
    inside = !!action && completedMoves > 0 && completedMoves < action.moves.length;
  const notes: string[] = [];
  if (!frame.eoReferenceValid)
    notes.push(
      'Middle-slice setup in progress. Wait for a white or yellow up center before judging edge orientation.',
    );
  if (inside && action?.roux?.temporaryNote) notes.push(action.roux.temporaryNote);
  else if (action?.roux?.protection === 'endpoint' && completedMoves < action.moves.length)
    notes.push('Check the protected pieces after this complete maneuver, not midway through it.');
  return {
    frameLabel: 'Blue left · green right · white-bottom block frame',
    centerLabel,
    reference: frame.eoReferenceValid ? 'ready' : 'setup-required',
    note: notes.join(' ') || undefined,
    protectedIds: action?.roux?.protectedIds ?? [],
  };
}
