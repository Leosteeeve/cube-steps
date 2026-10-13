import { expect, it } from 'vitest';
import { getAlgorithmCase, getAlgorithmVariant } from './registry';
it.each(['constructor', 'toString', '__proto__'])(
  'treats inherited property %s as an unknown catalog ID',
  (id) => {
    expect(getAlgorithmCase(id)).toBeUndefined();
    expect(getAlgorithmVariant(id)).toBeUndefined();
  },
);
