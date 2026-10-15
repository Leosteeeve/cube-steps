import { expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createCubeEngine } from '../src/core/cube';
import { stateToFacelets } from '../src/core/facelets';
import { prepareLabInput } from '../src/lab/input';
import { labContext } from './fixtures/lab-context';
import { seededScramble } from './fixtures/lbl-cases';
import { collectLabSeeds, independentLabReplay } from './helpers/lab-replay';

it('replays 1000 fixed inputs with a minimum seed for every allowed color and equivalent face entries', async () => {
  const engine = await createCubeEngine(),
    independent = await createCubeEngine(),
    context = labContext(engine);
  const count = Number(process.env.LAB_CORPUS_LIMIT ?? 1000),
    rows: unknown[] = [];
  if (!Number.isInteger(count) || count < 1 || count > 1000)
    throw Error('Invalid diagnostic corpus limit');
  for (let seed = 1; seed <= count; seed++) {
    const moves = seededScramble(seed),
      scramble = prepareLabInput(engine, { kind: 'scramble', moves });
    const colors = prepareLabInput(engine, {
      kind: 'facelets',
      facelets: stateToFacelets(scramble.initial),
    });
    const input = seed % 2 ? scramble : colors,
      before = structuredClone(input);
    try {
      const result = collectLabSeeds(context, input);
      expect(result.routes).toHaveLength(6);
      expect(new Set(result.routes.map((r) => r.startHold.bottom)).size).toBe(6);
      for (const route of result.routes) {
        expect(route.crossLength).toBe(route.crossMinimum);
        independentLabReplay(independent, route, context.table);
        const a = independent.apply(
          scramble.initial,
          route.actions.flatMap((a) => a.moves),
        );
        const b = independent.apply(
          colors.initial,
          route.actions.flatMap((a) => a.moves),
        );
        expect(independent.equals(a, b)).toBe(true);
      }
      expect(input).toEqual(before);
      expect(result.maxWorkGap).toBeLessThanOrEqual(256);
      rows.push({
        seed,
        operations: result.operations,
        elapsedMs: result.elapsedMs,
        maxWorkGap: result.maxWorkGap,
        coverage: result.coverage,
      });
    } catch (error) {
      throw Error(
        `Lab seed ${seed}; ${moves.join(' ')}; six colors; lab-search-v1 / lab-execution-v1; ${String(error)}`,
        { cause: error },
      );
    }
  }
  mkdirSync('test-results', { recursive: true });
  writeFileSync(
    'test-results/lab-corpus.json',
    JSON.stringify({ count, fullCorpus: count === 1000, rows }, null, 2),
  );
}, 1_800_000);
