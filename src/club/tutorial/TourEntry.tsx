import { useLayoutEffect } from 'react';
import { useOptionalClubTutorial } from './TutorialProvider';
import { TOURS } from './catalog';
import type { TourId } from './types';
export function TourEntry({ tourId, ready = true }: { tourId: TourId; ready?: boolean }) {
  const api = useOptionalClubTutorial(),
    runtime = api?.runtime;
  useLayoutEffect(() => runtime?.registerEntry(tourId, ready), [runtime, tourId, ready]);
  if (!api) return null;
  const reminder =
    ready &&
    !api.overlayOpen &&
    api.preferences.welcome !== 'never' &&
    api.preferences.dismissed[tourId] !== TOURS[tourId].contentVersion;
  return (
    <aside className="tour-entry" aria-label="Page help">
      <button
        disabled={!ready}
        onClick={(e) => {
          e.currentTarget.focus();
          api.requestStart(tourId);
        }}
      >
        Page tour
      </button>
      {reminder && (
        <span className="tour-invitation">
          <button
            disabled={!ready}
            onClick={(e) => {
              e.currentTarget.focus();
              api.requestStart(tourId);
            }}
          >
            Show me this page
          </button>
          <button
            aria-label="Dismiss page invitation"
            onClick={() => api.dismissInvitation(tourId)}
          >
            ×
          </button>
        </span>
      )}
      {!api.storage.writable && <small>Tutorial choices are kept for this visit only.</small>}
    </aside>
  );
}
