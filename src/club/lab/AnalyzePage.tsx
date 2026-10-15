import { useGuidanceTarget } from '../../ui/guidance';
import { useLabSession } from './LabSessionProvider';
import { CandidateCard } from './CandidateCard';
export function AnalyzePage({
  part = 'recommendation',
}: {
  part?: 'recommendation' | 'alternatives';
}) {
  const { state } = useLabSession(),
    target = useGuidanceTarget(
      part === 'recommendation' ? 'lab.recommendation' : 'lab.alternatives',
    );
  const routes =
    part === 'recommendation' ? state.snapshot.routes.slice(0, 1) : state.snapshot.routes.slice(1);
  if (part === 'alternatives' && !routes.length) return null;
  return (
    <section
      ref={target}
      aria-label={part === 'recommendation' ? 'Analysis results' : 'Alternative routes'}
    >
      {!state.snapshot.routes.length ? (
        <div className="lab-card">
          <h2>Find your flow.</h2>
          <p>
            Choose your starting cube and cross colors, then Analyze. Complete routes appear as they
            pass physical verification.
          </p>
          <p>No result yet. An incomplete search is not proof that your cube is illegal.</p>
        </div>
      ) : (
        <div className="lab-candidates">
          {routes.map((checked) => (
            <CandidateCard
              key={checked.route.id}
              checked={checked}
              recommended={checked.route.id === state.snapshot.recommendedRouteId}
            />
          ))}
        </div>
      )}
    </section>
  );
}
