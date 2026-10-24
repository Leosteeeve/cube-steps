import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CubeEngine } from '../../core/types';
import type { RouxRoute } from '../../roux-lab/types';
import { loadRouxLabAssets } from '../../roux-lab/browser-assets';
import { prepareRouxPlayback } from '../../roux-lab/playback';
import type { PlaybackSource, PlaybackSectionId } from '../../player/playback-source';
import type { SourcePlaybackSnapshot } from '../../player/controller';
import { PlaybackView, type PlaybackHandle } from '../../player/PlaybackView';
type Prepared = ReturnType<typeof prepareRouxPlayback>;
interface Props {
  engine: CubeEngine;
  route: RouxRoute;
  onPosition?: (p: SourcePlaybackSnapshot) => void;
  onHandle?: (h: PlaybackHandle | null) => void;
}
function Ready({ engine, route, prepared, onPosition, onHandle }: Props & { prepared: Prepared }) {
  const source = useMemo<PlaybackSource>(() => ({ kind: 'roux-lab', prepared }), [prepared]);
  const [position, setPosition] = useState<SourcePlaybackSnapshot>(),
    [section, setSection] = useState<PlaybackSectionId>('ar-position'),
    [request, setRequest] = useState(0);
  const report = useCallback(
    (p: SourcePlaybackSnapshot) => {
      setPosition(p);
      onPosition?.(p);
    },
    [onPosition],
  );
  const events = prepared.handling.filter(
    (e) => e.boundary === position?.moveIndex && e.kind !== 'turn',
  );
  return (
    <>
      <p>
        {prepared.label}. Follow the printed physical hold; camera dragging only changes your view.
      </p>
      <p>
        Both-block trial endpoint: move {route.boundaries.secondEnd}, before CMLL. Positioning is
        outside the block subtotal; follow later rotations as real moves. CMLL and LSE play
        afterward.
      </p>
      <label className="roux-route-section">
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
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <div aria-label="Estimated handling instructions" aria-live="polite">
        {events.map((e, i) => (
          <p key={i}>
            <strong>
              {e.kind === 'regrip'
                ? 'Hand adjustment'
                : e.kind === 'rotation'
                  ? 'Physical cube turn'
                  : 'Handling estimate'}
              :
            </strong>{' '}
            {e.instruction}
          </p>
        ))}
        {position?.moveIndex === route.boundaries.secondEnd && (
          <p className="notice">
            Both blocks complete — the trial endpoint. Continue separately to the corners and last
            six edges.
          </p>
        )}
      </div>
      <PlaybackView
        engine={engine}
        source={source}
        section={section}
        sectionRequestId={request}
        onPosition={report}
        onHandle={onHandle}
      />
    </>
  );
}
export function RouxLabPlayer(props: Props) {
  const { engine, route } = props,
    [prepared, setPrepared] = useState<{ route: RouxRoute; value: Prepared }>(),
    [error, setError] = useState(''),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true;
    setError('');
    void loadRouxLabAssets()
      .then((a) => prepareRouxPlayback(engine, route, a))
      .then(
        (value) => {
          if (live) setPrepared({ route, value });
        },
        (e) => {
          if (live) setError(e instanceof Error ? e.message : 'Unable to prepare this route.');
        },
      );
    return () => {
      live = false;
    };
  }, [engine, route, retry]);
  return (
    <section
      className="roux-lab-player"
      aria-label="Selected Roux route"
      data-selected-route={route.id}
    >
      {error ? (
        <div role="alert">
          {error}
          <button onClick={() => setRetry((n) => n + 1)}>Retry route playback</button>
        </div>
      ) : prepared?.route === route ? (
        <Ready key={route.id} {...props} prepared={prepared.value} />
      ) : (
        <p role="status">Checking the route for playback…</p>
      )}
    </section>
  );
}
