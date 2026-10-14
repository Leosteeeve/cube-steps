import type { ReactNode } from 'react';
import type { TourId } from './types';
import { TutorialProvider, TutorialRouteBoundary } from './TutorialProvider';
import { TourEntry } from './TourEntry';
// Test harness only; never imported by a production entry.
export function TestTour({ id, children }: { id: TourId; children: ReactNode }) {
  return (
    <TutorialProvider>
      <TutorialRouteBoundary routeKey={id} tourId={id}>
        <TourEntry tourId={id} />
        {children}
      </TutorialRouteBoundary>
    </TutorialProvider>
  );
}
