import { useState } from 'react';
import type { CubeEngine } from '../../core/types';
import type { RouxFrameId } from '../../methods/roux-advanced/types';
import { ROUX_FRAMES } from '../../methods/roux-advanced/frames';
import { SolvePage } from '../../app/SolvePage';
import type { ClubRoute } from '../routes';
import { CmllLibrary } from './CmllLibrary';
import { CmllCasePage } from './CmllCasePage';
import { CmllPractice } from './CmllPractice';
export function AdvancedRouxFeaturePage({
  engine,
  route,
}: {
  engine: CubeEngine;
  route: ClubRoute;
}) {
  const [allowedFrames, setFrames] = useState<readonly RouxFrameId[]>(['white-blue']);
  if (route.kind === 'cmll-library') return <CmllLibrary engine={engine} />;
  if (route.kind === 'cmll-case') return <CmllCasePage engine={engine} caseId={route.caseId} />;
  if (route.kind === 'cmll-practice') return <CmllPractice engine={engine} />;
  return (
    <>
      <fieldset className="roux-frame-options">
        <legend>Choose your block frames</legend>
        <p>
          Start with white bottom, blue left. Add comfortable frames to compare; the solver searches
          within a bounded budget.
        </p>
        <div className="cmll-selection">
          {ROUX_FRAMES.map((f) => (
            <label key={f.id}>
              <input
                type="checkbox"
                checked={allowedFrames.includes(f.id)}
                disabled={allowedFrames.length === 1 && allowedFrames[0] === f.id}
                onChange={(e) =>
                  setFrames(
                    e.target.checked
                      ? [...allowedFrames, f.id]
                      : allowedFrames.filter((id) => id !== f.id),
                  )
                }
              />
              {f.bottom} bottom · {f.left} left
            </label>
          ))}
        </div>
      </fieldset>
      <SolvePage
        engine={engine}
        method="roux-advanced"
        rouxOptions={{ allowedFrames, onAllowedFramesChange: setFrames }}
      />
    </>
  );
}
