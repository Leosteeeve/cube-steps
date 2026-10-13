import type { AlgorithmRegistry } from './types';
import type { TeachingAlgorithm } from '../methods/contracts';
import { isTeachingMove } from '../core/teaching-moves';
function require(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Algorithm admission: ${message}`);
}
function admitAlgorithm(algorithm: TeachingAlgorithm, id: string): void {
  require(algorithm.name &&
    algorithm.precondition &&
    algorithm.effect, `${id} needs teaching metadata.`);
  require(algorithm.moves.length > 0 &&
    algorithm.moves.every(isTeachingMove), `${id} contains unsupported moves.`);
  if (algorithm.segments) {
    let end = 0;
    for (const segment of algorithm.segments) {
      require(segment.label &&
        Number.isInteger(segment.start) &&
        Number.isInteger(segment.end) &&
        segment.start === end &&
        segment.end > segment.start &&
        segment.end <= algorithm.moves.length, `${id} has invalid or noncontiguous segments.`);
      end = segment.end;
    }
    require(end === algorithm.moves.length, `${id} segments must cover the complete formula.`);
  }
}
export function admitRegistry(registry: AlgorithmRegistry): void {
  const caseIds = new Set<string>(),
    variantIds = new Set<string>();
  for (const [key, c] of Object.entries(registry.cases)) {
    require(key === c.id && !caseIds.has(c.id), `Duplicate or mismatched case ID ${c.id}.`);
    caseIds.add(c.id);
    require((c.family === 'f2l' && /^f2l-(0[1-9]|[1-3][0-9]|4[01])$/.test(c.id)) ||
      (c.family === 'oll' && /^oll-(0[1-9]|[1-4][0-9]|5[0-7])$/.test(c.id)) ||
      (c.family === 'pll' &&
        /^pll-(aa|ab|e|f|ga|gb|gc|gd|h|ja|jb|na|nb|ra|rb|t|ua|ub|v|y|z)$/.test(
          c.id,
        )), `Invalid family or stable case ID ${c.id}.`);
    require(c.canonicalSignature &&
      c.label &&
      c.group &&
      c.recognition &&
      c.sourceRefs.length > 0, `${c.id} lacks case metadata.`);
    require(c.variantIds.length > 0 &&
      new Set(c.variantIds).size === c.variantIds.length &&
      c.variantIds.includes(c.defaultVariantId), `${c.id} has no unique default variant.`);
    require(c.fixtureIds.length > 0 &&
      new Set(c.fixtureIds).size === c.fixtureIds.length, `${c.id} needs distinct fixture IDs.`);
    for (const id of c.variantIds)
      require(registry.variants[id]?.caseId ===
        c.id, `${c.id} refers to missing or foreign variant ${id}.`);
  }
  for (const [key, v] of Object.entries(registry.variants)) {
    require(key === v.id && !variantIds.has(v.id), `Duplicate or mismatched variant ID ${v.id}.`);
    variantIds.add(v.id);
    require(registry.cases[v.caseId]?.variantIds.includes(
      v.id,
    ), `${v.id} is not owned by its case.`);
    require(v.startSignature &&
      v.sourceRefs.length > 0 &&
      [0, 1, 2].includes(
        v.executionPenalty,
      ), `${v.id} has invalid recognition or execution metadata.`);
    require(v.targetSlot === undefined ||
      ['FR', 'FL', 'BR', 'BL'].includes(v.targetSlot), `${v.id} has an invalid target slot.`);
    admitAlgorithm(v, v.id);
  }
  for (const [id, alg] of Object.entries(registry.preparations)) {
    require(!registry.variants[id] &&
      !registry.cases[id], `Preparation ${id} overlaps a case or variant.`);
    admitAlgorithm(alg, id);
  }
}
