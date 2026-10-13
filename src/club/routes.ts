import { parseRoute, type AppRoute } from '../app/routes';
export type ClubRoute = { kind: 'home' } | { kind: 'quiz' } | { kind: 'timer' } | AppRoute;
export function parseClubRoute(hash: string): ClubRoute {
  const value = hash.replace(/^#\/?/, '').replace(/\/$/, '');
  if (!value || value === 'home') return { kind: 'home' };
  if (value === 'find-your-route') return { kind: 'quiz' };
  if (value === 'timer') return { kind: 'timer' };
  return parseRoute(hash);
}
