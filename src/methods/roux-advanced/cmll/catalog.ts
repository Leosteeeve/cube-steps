import type { CubeEngine, TeachingMove } from '../../../core/types';
import { invertTeachingMoves } from '../../../core/teaching-moves';
import { freezeLabValue } from '../../../lab/input';
import { rouxReferenceState, observeRouxFrame } from '../../roux/frame';
import { blockTargets } from '../../roux/predicates';
import { CMLL_SOURCE_DATA } from './data';
import generated from '../data/cmll-catalog.json';
import type { CmllCatalog, CmllVariant } from './types';
export function deeplyFrozen(value: unknown, seen = new Set<object>()): boolean {
  if (value === null || typeof value !== 'object' || seen.has(value)) return true;
  if (!Object.isFrozen(value)) return false;
  seen.add(value);
  return Object.values(value).every((child) => deeplyFrozen(child, seen));
}
export function cmllDigest(c: Omit<CmllCatalog, 'digest'>): string {
  const text = JSON.stringify({ version: c.version, cases: c.cases, variants: c.variants });
  let hash = 2166136261;
  for (const ch of text) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
}
export function buildCmllCatalog(e: CubeEngine): CmllCatalog {
  const ref = rouxReferenceState(e),
    protectedIds = [...blockTargets(e, 'left'), ...blockTargets(e, 'right')].map((p) => p.id);
  const variants: Record<string, CmllVariant> = {};
  const cases = CMLL_SOURCE_DATA.map((c) => {
    const variantIds = c.variants.map((v, index) => {
      const id = `${c.id}-${index === 0 ? 'primary' : 'alternate'}`,
        moves = v.chunks.flatMap((chunk) => chunk.split(' ')) as TeachingMove[];
      const effect = e.apply(e.solved(), moves),
        phase = observeRouxFrame(e, e.apply(ref, moves)).centerPhase;
      if (phase === null) throw Error(`CMLL ${id} leaves the side frame.`);
      const before = e.observe(e.apply(ref, invertTeachingMoves(moves)));
      const recognition = before.corners
        .filter((p) => p.slot.includes('U'))
        .map(
          (p) =>
            `${p.slot}: ${Object.entries(p.stickers)
              .map(([f, color]) => `${color} on ${f}`)
              .join(', ')}`,
        )
        .join('; ');
      let offset = 0;
      variants[id] = {
        id,
        caseId: c.id,
        name: `${c.family} · ${c.label}${index ? ' (alternative)' : ''}`,
        moves,
        holdingMoves: [],
        recognition,
        precondition:
          'Both side blocks complete. Match the top-corner orientation AND the side-color arrangement; ignore the six remaining edges.',
        effect:
          'Restore both blocks and solve the top corners in cyclic order. The U offset, middle centers and remaining edges are checked afterward.',
        segments: v.chunks.map((chunk, i) => {
          const start = offset;
          offset += chunk.split(' ').length;
          return {
            label:
              i === v.chunks.length - 1 ? 'Finish, then check both blocks' : `Sequence ${i + 1}`,
            start,
            end: offset,
          };
        }),
        sourceRefs: [
          {
            url: 'https://docs.google.com/document/d/1S_y2evAxJ2vMMFDtfGSOsgHuDMYR-sEjoEU_mtSD7Qc/edit',
            title: "Kian's CMLLs",
            accessed: '2026-10-23',
            usageNotes: `${v.preference} Source notation: ${v.sourceNotation}. Parenthesized U setup is recognized from the actual state; prime half turns are equivalent half turns and lowercase r is Rw.`,
          },
          {
            url: 'https://sites.google.com/view/kianroux/cmll',
            title: 'Kian Roux Method Guide: CMLL and execution video',
            accessed: '2026-10-23',
            usageNotes:
              'Original author companion execution resource. Explanations and diagrams in CubeSteps are original.',
          },
        ],
        executionProfileId: 'roux-execution-v1/primitive-composition',
        protectedIds: [...protectedIds],
        centerPhaseDelta: phase,
        edgeTransform: {
          permutation: [...effect.data.EDGES.pieces],
          orientationDelta: [...effect.data.EDGES.orientation],
        },
        default: index === 0,
      };
      return id;
    });
    return { id: c.id, family: c.family, label: c.label, variantIds };
  });
  const data = { version: 'cmll-v1', cases, variants };
  return { ...data, digest: cmllDigest(data) };
}
export const CMLL_CATALOG = freezeLabValue(generated as unknown as CmllCatalog);
