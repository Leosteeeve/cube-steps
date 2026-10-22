import { parseRoute, type AppRoute } from '../app/routes';
import { GUIDE_SECTION_IDS, type GuideSectionId } from './guide/types';
export type ClubRoute =
  | { kind: 'home' }
  | { kind: 'quiz' }
  | { kind: 'timer' }
  | { kind: 'moves' }
  | { kind: 'lab'; view: 'analyze' | 'compare' | 'trials' }
  | { kind: 'guide'; section?: GuideSectionId }
  | AppRoute;
export function parseClubRoute(hash: string): ClubRoute {
  const value = hash.replace(/^#\/?/, '').replace(/\/$/, '');
  if (!value || value === 'home') return { kind: 'home' };
  if (value === 'find-your-route') return { kind: 'quiz' };
  if (value === 'timer') return { kind: 'timer' };
  if (value === 'moves') return { kind: 'moves' };
  if (value === 'lab') return { kind: 'lab', view: 'analyze' };
  if (value === 'lab/compare') return { kind: 'lab', view: 'compare' };
  if (value === 'lab/trials') return { kind: 'lab', view: 'trials' };
  if (value.startsWith('lab/')) return { kind: 'not-found' };
  if (value === 'guide') return { kind: 'guide' };
  if (value.startsWith('guide/')) {
    const section = value.slice(6) as GuideSectionId;
    return GUIDE_SECTION_IDS.includes(section) ? { kind: 'guide', section } : { kind: 'not-found' };
  }
  return parseRoute(hash, 'club');
}
