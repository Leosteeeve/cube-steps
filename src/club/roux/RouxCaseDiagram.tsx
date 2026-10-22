import type { RouxDiagramModel } from '../../content/roux/diagrams';
import type { Face } from '../../core/types';
export function RouxCaseDiagram({ model, label }: { model: RouxDiagramModel; label: string }) {
  return (
    <figure className="roux-diagram">
      <div className="roux-net" role="img" aria-label={label + ' ' + model.caption}>
        {(['U', 'L', 'F', 'R', 'B', 'D'] as Face[]).map((face) => (
          <div key={face} className={'roux-net-face face-' + face}>
            <b>{face}</b>
            <div>
              {model.facelets[face].map((color, index) => {
                const show = model.visible.some((p) => p.face === face && p.index === index);
                return (
                  <span
                    key={index}
                    className={show ? 'roux-sticker target' : 'roux-sticker ignored'}
                    style={{ background: show ? `var(--roux-${color})` : undefined }}
                    title={show ? `${face}${index + 1}: ${color}` : 'Ignored sticker'}
                  >
                    {show ? color.slice(0, 1).toUpperCase() : '·'}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <figcaption>{model.caption}</figcaption>
    </figure>
  );
}
