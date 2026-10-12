import type { StageResult } from '../contracts';
import { ensureWhiteDown, type CFOPContext } from './context';
import { pieceSolved, whiteCrossSolved } from '../shared/pieces';
import { EDGE_SLOTS } from '../../core/observations';
import { RuleError } from '../shared/trace';
import { preservesCrossEdges, recognizeCross } from './cross-cases';
export function solveCFOPCross(c: CFOPContext): StageResult {
  const { engine, trace } = c;
  if (whiteCrossSolved(engine, trace.current)) return { ok: true, state: trace.current };
  ensureWhiteDown(c);
  for (const id of EDGE_SLOTS.slice(0, 4)) {
    for (let step = 0; step < 8; step++) {
      const before = trace.current,
        o = engine.observe(before),
        edge = o.edges.find((p) => p.id === id)!;
      if (pieceSolved(edge, o)) break;
      const match = recognizeCross(engine, before, id);
      if (!match)
        throw new RuleError('unsupported-case', 'cfop-cross', `No cross rule for ${edge.slot}.`);
      trace.append({
        ...match,
        ruleId: match.caseId,
        targets: [id],
        check: {
          id: 'cross-protected',
          description: 'Previously matched cross edges are restored after this maneuver.',
          test: (s) => preservesCrossEdges(engine, before, s),
        },
      });
      if (step === 7)
        throw new RuleError('budget', 'cfop-cross', 'Cross preparation budget exceeded.');
    }
  }
  return { ok: true, state: trace.current };
}
