import { expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { cpus, platform } from 'node:os';
import { createCubeEngine } from '../src/core/cube';
import { countTeachingMoves } from '../src/core/move-metrics';
import { solveAdvancedCFOP } from '../src/methods/advanced/solve';
import { prepareLabInput } from '../src/lab/input';
import { selectLabRoutes } from '../src/lab/search';
import { scoreExecution } from '../src/lab/execution/score';
import { createLabBudget } from '../src/lab/budget';
import type { ExecutionSegment } from '../src/lab/execution/types';
import type { F2LTarget } from '../src/methods/advanced/f2l/types';
import { labContext } from './fixtures/lab-context';
import { seededScramble } from './fixtures/lbl-cases';
import { collectLabSeeds, independentLabReplay } from './helpers/lab-replay';
it('records White-only and All-six against Advanced without claiming a universal speed advantage', async () => {
  const e = await createCubeEngine(),
    independent = await createCubeEngine(),
    context = labContext(e),
    rows: unknown[] = [];
  const count = Number(process.env.LAB_EFFICIENCY_LIMIT ?? 40);
  for (let seed = 1; seed <= count; seed++) {
    const input = prepareLabInput(e, { kind: 'scramble', moves: seededScramble(seed) }),
      start = performance.now();
    const advanced = solveAdvancedCFOP(e, input.initial, { crossTable: context.table });
    if (!advanced.ok) throw Error(advanced.message);
    const baseline = {
      runtimeMs: performance.now() - start,
      ...countTeachingMoves(
        advanced.trace.stages
          .slice(0, 2)
          .flatMap((s) =>
            s.actions.filter((a) => a.ruleId !== 'advanced-holding').flatMap((a) => a.moves),
          ),
      ),
    };
    const segments: ExecutionSegment[] = advanced.trace.stages.slice(0, 2).flatMap((stage) =>
      stage.actions
        .filter((a) => a.ruleId !== 'advanced-holding')
        .map((action) => {
          const profile = action.algorithmId
            ? context.profiles.formulas[action.algorithmId]
            : undefined;
          return {
            phase: stage.id === 'advanced-cross' ? ('cross' as const) : ('f2l' as const),
            moves: action.moves,
            algorithmId: action.algorithmId,
            recognition:
              profile && action.pair
                ? {
                    observation: e.observe(action.before),
                    target: action.pair as F2LTarget,
                    bottomColor: 'white' as const,
                    mode: profile.recognition,
                  }
                : undefined,
          };
        }),
    );
    let estimatedScore;
    for (const event of scoreExecution(
      segments,
      context.profiles,
      createLabBudget({ now: () => 0 }),
    ))
      if (event.kind === 'paths')
        estimatedScore = event.paths[0]?.score ?? { rated: false, reason: event.unratedReason };
    expect(estimatedScore).toBeDefined();
    const record = (result: ReturnType<typeof collectLabSeeds>) => {
      const chosen = selectLabRoutes(result.routes)[0];
      expect(chosen).toBeDefined();
      independentLabReplay(independent, chosen, context.table);
      return {
        runtimeMs: result.elapsedMs,
        operations: result.operations,
        rated: chosen.score.rated,
        score: chosen.score,
        bottom: chosen.startHold.bottom,
        crossMinimum: chosen.crossMinimum,
        crossLength: chosen.crossLength,
      };
    };
    rows.push({
      seed,
      advanced: { ...baseline, estimatedScore },
      white: record(collectLabSeeds(context, input, ['white'])),
      allSix: record(collectLabSeeds(context, input)),
    });
  }
  mkdirSync('test-results', { recursive: true });
  writeFileSync(
    'test-results/lab-efficiency.json',
    JSON.stringify(
      {
        configuration: 'minimum cross seeds; complete F2L seed; no optional 30-second exploration',
        count,
        environment: { node: process.version, cpu: cpus()[0]?.model, platform: platform() },
        rows,
      },
      null,
      2,
    ),
  );
}, 300_000);
