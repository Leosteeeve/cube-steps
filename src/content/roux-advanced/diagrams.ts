import type { CubeEngine } from '../../core/types';
import { buildRouxDiagram } from '../roux/diagrams';
import { createRouxFrameMap } from '../../methods/roux-advanced/frames';
import { blockTargets } from '../../methods/roux/predicates';
import type { RouxWorkedExample } from './examples';
export function advancedRouxExampleDiagram(engine: CubeEngine, example: RouxWorkedExample) {
  const map = createRouxFrameMap(engine, example.frameId),
    side = example.stageId === 'ar-second-block' ? 'right' : 'left';
  return buildRouxDiagram(
    engine,
    engine.apply(engine.solved(), example.setup),
    blockTargets(engine, side).map((p) => map.toPhysicalId(p.id)),
    example.stageId === 'ar-cmll' ? 'corners' : example.stageId === 'ar-eolr' ? 'lse' : 'block',
  );
}
