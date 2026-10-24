import type { RouxRoute } from './types';
import { isVerifiedRouxRoute } from '../methods/roux-advanced/validate';
import { freezeLabValue } from '../lab/input';
export interface RouxPinnedComparison {
  id: string;
  inputFingerprint: string;
  A: RouxRoute;
  B: RouxRoute;
}
export function pinRouxComparison(a: RouxRoute, b: RouxRoute): RouxPinnedComparison {
  if (!isVerifiedRouxRoute(a) || !isVerifiedRouxRoute(b))
    throw Error('Choose two verified Roux routes.');
  if (a.id === b.id) throw Error('Choose two distinct routes.');
  if (a.input.fingerprint !== b.input.fingerprint)
    throw Error('Both routes must use the same input.');
  return freezeLabValue({
    id: `compare/${a.id}/${b.id}`,
    inputFingerprint: a.input.fingerprint,
    A: a,
    B: b,
  });
}
