import type { CubeEngine, CubeState, TraceAction } from '../core/types';
export function RegripGuide({
  engine,
  boundaryState,
  action,
  moving,
}: {
  engine: CubeEngine;
  boundaryState: CubeState;
  action?: TraceAction;
  moving: boolean;
}) {
  const now = engine.observe(boundaryState).centers;
  const destination = action?.kind === 'regrip' ? engine.observe(action.after).centers : undefined;
  const pairColors = action?.pair
    ? Object.values(
        engine.observe(boundaryState).corners.find((p) => p.id === action.pair!.cornerId)!.stickers,
      )
    : [];
  const workingSlot =
    destination && pairColors.length
      ? ['FR', 'FL', 'BR', 'BL'].find((slot) =>
          [...slot].every((face) =>
            pairColors.includes(destination[face as 'F' | 'R' | 'B' | 'L']),
          ),
        )
      : undefined;
  const hasInternalRotation =
    action?.kind === 'algorithm' && action.moves.some((m) => /^[xyz]/.test(m));
  const hasLayerTurn = action?.moves.some((m) => /w|^[MES]/.test(m));
  return (
    <section className="regrip-guide" aria-label="Holding guide">
      <p aria-label="Current holding" data-front-color={now.F} data-up-color={now.U}>
        <strong>Holding now:</strong> {now.U} up · {now.F} front
      </p>
      {moving && <small>Showing the last completed move while the cube turns.</small>}
      {destination && (
        <>
          <p aria-label="After this regrip">
            <strong>After this regrip:</strong> {destination.U} up · {destination.F} front
          </p>
          <p>
            Turn your whole cube with the animation.{' '}
            {workingSlot && <>Working slot after the turn: {workingSlot}. </>}Continue from the new
            hold.
          </p>
        </>
      )}
      {hasInternalRotation && (
        <p>
          Follow the physical rotations inside this formula; the holding colors update after each
          completed move.
        </p>
      )}
      {hasLayerTurn && (
        <small>
          Wide turns move two layers; M/E/S move one inner slice. Follow those layers, not a
          whole-cube rotation.
        </small>
      )}
      {(destination || hasInternalRotation) && (
        <small>Dragging the view only changes your viewpoint.</small>
      )}
    </section>
  );
}
