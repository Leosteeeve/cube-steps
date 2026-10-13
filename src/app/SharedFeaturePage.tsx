import { lazy, Suspense } from 'react';
import type { CubeEngine } from '../core/types';
import type { AppRoute } from './routes';
const LearnPage = lazy(() => import('./LearnPage').then((m) => ({ default: m.LearnPage })));
const SolvePage = lazy(() => import('./SolvePage').then((m) => ({ default: m.SolvePage })));
const AlgorithmLibraryPage = lazy(() =>
  import('./algorithms/AlgorithmLibraryPage').then((m) => ({ default: m.AlgorithmLibraryPage })),
);
const AlgorithmDetailPage = lazy(() =>
  import('./algorithms/AlgorithmDetailPage').then((m) => ({ default: m.AlgorithmDetailPage })),
);
const PracticePage = lazy(() =>
  import('./practice/PracticePage').then((m) => ({ default: m.PracticePage })),
);
export type SharedFeatureRoute = Exclude<AppRoute, { kind: 'not-found' }>;
export function SharedFeaturePage({
  route,
  engine,
}: {
  route: SharedFeatureRoute;
  engine: CubeEngine;
}) {
  return (
    <Suspense
      fallback={
        <p className="loading-panel" role="status">
          Loading your tools…
        </p>
      }
    >
      {route.kind === 'practice' ? (
        <PracticePage engine={engine} />
      ) : route.kind === 'algorithms' ? (
        <AlgorithmLibraryPage engine={engine} />
      ) : route.kind === 'algorithm' ? (
        <AlgorithmDetailPage engine={engine} caseId={route.caseId} />
      ) : route.kind === 'solve' ? (
        <SolvePage engine={engine} method={route.method} />
      ) : (
        <LearnPage
          key={route.method + '/' + route.lessonId}
          engine={engine}
          method={route.method}
          lessonId={route.lessonId}
        />
      )}
    </Suspense>
  );
}
