import type { CubeEngine } from '../../core/types';
import { useEffect, useState } from 'react';
import type { AppRoute } from '../../app/routes';
import { prepareRouxPlayback } from '../../methods/roux/browser-runtime';
import { ClubLearnPage } from '../learning/ClubLearnPage';
import { SolvePage } from '../../app/SolvePage';
import { registerRouxCourse } from '../../content/courses';
import { ROUX_COURSE } from '../../content/roux-course';
registerRouxCourse(ROUX_COURSE);
export function RouxFeaturePage({
  engine,
  route,
}: {
  engine: CubeEngine;
  route: Extract<AppRoute, { kind: 'learn' | 'solve' }>;
}) {
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState<{ ready: boolean; error: string }>({
    ready: false,
    error: '',
  });
  useEffect(() => {
    let live = true;
    setLoading({ ready: false, error: '' });
    prepareRouxPlayback().then(
      () => {
        if (live) setLoading({ ready: true, error: '' });
      },
      (error) => {
        if (live)
          setLoading({
            ready: false,
            error:
              error instanceof Error
                ? error.message
                : 'Unable to load Roux playback. Please retry.',
          });
      },
    );
    return () => {
      live = false;
    };
  }, [attempt]);
  if (loading.error)
    return (
      <section role="alert">
        <p>{loading.error}</p>
        <button onClick={() => setAttempt((n) => n + 1)}>Retry loading Roux</button>
      </section>
    );
  if (!loading.ready) return <p role="status">Loading Beginner Roux…</p>;
  return route.kind === 'learn' ? (
    <ClubLearnPage engine={engine} method="roux-beginner" lessonId={route.lessonId} />
  ) : (
    <SolvePage engine={engine} method="roux-beginner" />
  );
}
