import { parseRoute, type AppRoute } from '../app/routes';
import { GUIDE_SECTION_IDS, type GuideSectionId } from './guide/types';
import { CMLL_CASE_IDS } from '../methods/roux-advanced/cmll/ids';
import type { RouxFrameId } from '../methods/roux-advanced/types';
export type ClubRoute =
  | { kind: 'home' }
  | { kind: 'quiz' }
  | { kind: 'timer' }
  | { kind: 'moves' }
  | { kind: 'cmll-library' }
  | { kind: 'cmll-case'; caseId: string; variantId?: string; frameId?: RouxFrameId }
  | { kind: 'cmll-practice' }
  | { kind: 'lab'; view: 'analyze' | 'compare' | 'trials' }
  | { kind: 'roux-lab'; view: 'analyze' | 'compare' | 'trials' }
  | { kind: 'guide'; section?: GuideSectionId }
  | AppRoute;
export function parseClubRoute(hash: string): ClubRoute {
  const value = hash.replace(/^#\/?/, '').replace(/\/$/, '');
  if (!value || value === 'home') return { kind: 'home' };
  if (value === 'find-your-route') return { kind: 'quiz' };
  if (value === 'timer') return { kind: 'timer' };
  if (value === 'moves') return { kind: 'moves' };
  if (value === 'cmll') return { kind: 'cmll-library' };
  if (value === 'cmll-practice') return { kind: 'cmll-practice' };
  if (value.startsWith('cmll/')) {
    const [caseId, query] = value.slice(5).split('?'),
      params = new URLSearchParams(query),
      variantId = params.get('variant'),
      frameId = params.get('frame');
    if (
      !CMLL_CASE_IDS.includes(caseId) ||
      [...params.keys()].some(
        (k) => !['variant', 'frame'].includes(k) || params.getAll(k).length !== 1,
      ) ||
      (variantId !== null && ![caseId + '-primary', caseId + '-alternate'].includes(variantId)) ||
      (frameId !== null && !/^(white|yellow)-(blue|green|red|orange)$/.test(frameId))
    )
      return { kind: 'not-found' };
    return {
      kind: 'cmll-case',
      caseId,
      ...(variantId ? { variantId } : {}),
      ...(frameId ? { frameId: frameId as RouxFrameId } : {}),
    };
  }
  if (value === 'lab') return { kind: 'lab', view: 'analyze' };
  if (value === 'lab/compare') return { kind: 'lab', view: 'compare' };
  if (value === 'lab/trials') return { kind: 'lab', view: 'trials' };
  if (value.startsWith('lab/')) return { kind: 'not-found' };
  if (value === 'roux-lab') return { kind: 'roux-lab', view: 'analyze' };
  if (value === 'roux-lab/compare') return { kind: 'roux-lab', view: 'compare' };
  if (value === 'roux-lab/trials') return { kind: 'roux-lab', view: 'trials' };
  if (value.startsWith('roux-lab/')) return { kind: 'not-found' };
  if (value === 'guide') return { kind: 'guide' };
  if (value.startsWith('guide/')) {
    const section = value.slice(6) as GuideSectionId;
    return GUIDE_SECTION_IDS.includes(section) ? { kind: 'guide', section } : { kind: 'not-found' };
  }
  return parseRoute(hash, 'club');
}
