import type { MethodId } from '../core/types';
export type MethodEdition = 'global' | 'club';
const globalMethods: readonly MethodId[] = Object.freeze(['lbl', 'cfop-beginner', 'cfop-advanced']);
const clubMethods: readonly MethodId[] = Object.freeze([
  ...globalMethods,
  'roux-beginner',
  'roux-advanced',
]);
export const availableMethods = (edition: MethodEdition): readonly MethodId[] =>
  edition === 'club' ? clubMethods : globalMethods;
export const methodAvailable = (method: MethodId, edition: MethodEdition): boolean =>
  availableMethods(edition).includes(method);
