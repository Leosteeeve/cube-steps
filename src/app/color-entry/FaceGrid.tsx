import type { Face, Facelets, FaceletRef } from '../../core/types';
import { FACE_NAMES } from '../../core/facelet-layout';
interface Props {
  face: Face;
  facelets: Facelets;
  editable?: boolean;
  invalidCells?: readonly FaceletRef[];
  onPaint?: (cell: FaceletRef) => void;
}
export function FaceGrid({ face, facelets, editable = false, invalidCells = [], onPaint }: Props) {
  return (
    <div
      className={`sticker-grid ${editable ? 'editable' : 'readonly'}`}
      role="group"
      aria-label={`${FACE_NAMES[face]} stickers`}
    >
      {facelets[face].map((color, index) => {
        const center = index === 4;
        const label = `${FACE_NAMES[face]}, row ${Math.floor(index / 3) + 1}, column ${(index % 3) + 1}, ${color ?? 'unfilled'}${center ? ', fixed center' : ''}`;
        const invalid = invalidCells.some((cell) => cell.face === face && cell.index === index);
        const attributes = {
          className: `sticker${center ? ' center' : ''}`,
          'data-color': color ?? 'unfilled',
          'data-facelet': `${face}${index}`,
          'aria-label': label,
          'aria-invalid': invalid || undefined,
        };
        const content = (
          <>
            <span aria-hidden="true">{color ? color[0].toUpperCase() : '+'}</span>
            {center && <small aria-hidden="true">fixed</small>}
            {invalid && (
              <b className="sticker-issue" aria-hidden="true">
                !
              </b>
            )}
          </>
        );
        return editable && !center ? (
          <button
            type="button"
            key={index}
            {...attributes}
            onClick={() => onPaint?.({ face, index })}
          >
            {content}
          </button>
        ) : (
          <div key={index} {...attributes} role="img">
            {content}
          </div>
        );
      })}
    </div>
  );
}
