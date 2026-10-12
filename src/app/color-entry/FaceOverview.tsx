import type { Face, Facelets } from '../../core/types';
import type { FaceletIssue } from '../../core/facelets';
import { FACE_ENTRY_ORDER, FACE_GUIDES, FACE_NAMES } from '../../core/facelet-layout';
import { COLORS } from '../../core/observations';
import { FaceGrid } from './FaceGrid';
import './color-entry.css';
interface Props {
  facelets: Facelets;
  issues?: readonly FaceletIssue[];
  onEdit?: (face: Face) => void;
}
export function FaceOverview({ facelets, issues = [], onEdit }: Props) {
  return (
    <div className="face-overview">
      {FACE_ENTRY_ORDER.map((face) => (
        <section
          className="overview-face"
          key={face}
          aria-label={`${FACE_NAMES[face]} face overview`}
        >
          <div className="overview-title">
            <h3>
              {FACE_NAMES[face]} <span>{face}</span>
            </h3>
            {onEdit && (
              <button
                type="button"
                aria-label={`Edit ${FACE_NAMES[face]}`}
                onClick={() => onEdit(face)}
              >
                Edit
              </button>
            )}
          </div>
          <p className="orientation-marker">↑ {COLORS[FACE_GUIDES[face].top]} above</p>
          <FaceGrid
            face={face}
            facelets={facelets}
            invalidCells={issues.flatMap((issue) => issue.cells)}
          />
          <p className="orientation-marker">{COLORS[FACE_GUIDES[face].right]} right →</p>
        </section>
      ))}
    </div>
  );
}
