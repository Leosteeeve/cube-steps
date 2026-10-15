import { useMemo, useState } from 'react';
import type { CubeEngine } from '../../core/types';
import type { LabPlaybackData } from '../../lab/playback';
import type { VerifiedLabRoute } from '../../lab/validate';
import type { PlaybackSource, PlaybackSectionId } from '../../player/playback-source';
import type { SourcePlaybackSnapshot } from '../../player/controller';
import { PlaybackView, type PlaybackHandle } from '../../player/PlaybackView';
export function LabPlayer({
  engine,
  prepared,
  route,
  onHandle,
}: {
  engine: CubeEngine;
  prepared: LabPlaybackData;
  route: VerifiedLabRoute;
  onHandle?: (handle: PlaybackHandle | null) => void;
}) {
  const source = useMemo<PlaybackSource>(() => ({ kind: 'lab', prepared }), [prepared]);
  const [position, setPosition] = useState<SourcePlaybackSnapshot>(),
    [section, setSection] = useState<PlaybackSectionId>('lab-position'),
    [request, setRequest] = useState(0);
  const r = route.route,
    events = prepared.handling.filter(
      (e) => e.boundary === position?.moveIndex && e.kind !== 'turn',
    );
  return (
    <section className="lab-player" aria-label="Experimental route playback">
      <p>
        Exact minimum: {r.crossMinimum} face turns · This route's cross: {r.crossLength} face turns.
      </p>
      <p>
        Positioning comes before the trial. Cross + F2L ends at move {r.boundaries.f2lEnd}; OLL, PLL
        and final alignment are outside its estimate and timer.
      </p>
      {route.validationMode === 'archive' && (
        <p className="notice">
          Archived route — original formula definitions and model estimate. This is not a current
          recommendation.
        </p>
      )}
      <label>
        Route section{' '}
        <select
          aria-label="Route section"
          value={position?.sectionId ?? section}
          onChange={(e) => {
            setSection(e.target.value as PlaybackSectionId);
            setRequest((n) => n + 1);
          }}
        >
          {prepared.timeline.sections.map((s) => (
            <option value={s.id} key={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <p>
        Follow x/y/z as physical whole-cube turns. Dragging the camera only changes your view. Hand
        instructions below are model estimates to try, not measured fingertricks.
      </p>
      <div aria-label="Estimated handling instructions" aria-live="polite">
        {events.map((e, i) => (
          <p key={i}>
            <strong>
              {e.kind === 'hand-regrip'
                ? 'Move your hands, not the cube'
                : e.kind === 'rotation'
                  ? 'Physical cube turn'
                  : 'Handling estimate'}
              :
            </strong>{' '}
            {e.rationale}
          </p>
        ))}
        {position?.moveIndex === r.boundaries.f2lEnd && (
          <p className="notice">
            Cross + F2L complete — the trial endpoint. Last-layer playback can continue separately.
          </p>
        )}
      </div>
      <PlaybackView
        engine={engine}
        source={source}
        section={section}
        sectionRequestId={request}
        onHandle={onHandle}
        onPosition={setPosition}
      />
    </section>
  );
}
