import { it, expect } from 'vitest';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createCubeEngine } from '../src/core/cube';
import { prepareLabInput } from '../src/lab/input';
import { fixtureLabRoute, labContext } from './fixtures/lab-context';
import { seededScramble } from './fixtures/lbl-cases';
import { stateToFacelets } from '../src/core/facelets';
import { createLabFrame } from '../src/lab/frames';
import { exploreCross } from '../src/lab/cross';
import { createLabBudget } from '../src/lab/budget';
import { planLabF2L } from '../src/lab/f2l/planner';
import { finalizeLabRoute } from '../src/lab/finalize';
import { createExperiment, verifyExperiment } from '../src/lab/experiments/snapshots';
import { validateLabRoute } from '../src/lab/validate';
import { emptyLabData } from '../src/lab/experiments/schema';
import { assertTransfer, type LabTransferFile } from '../src/lab/experiments/transfer';
import type { LabRoute, LabInput } from '../src/lab/types';
it('replays all seven reproducible physical-review scenarios without claiming human acceptance', async () => {
  const engine = await createCubeEngine(),
    context = labContext(engine),
    path = 'docs/lab/physical-fixtures.json';
  if (process.env.WRITE_LAB_PHYSICAL_FIXTURES === '1') {
    const examples: { id: string; label: string; input: LabInput; routes: LabRoute[] }[] = [];
    const add = (
      id: string,
      label: string,
      seed: number,
      bottom: 'white' | 'yellow' | 'red' = 'white',
      colors = false,
    ) => {
      const input = prepareLabInput(
          engine,
          colors
            ? {
                kind: 'facelets',
                facelets: stateToFacelets(engine.apply(engine.solved(), seededScramble(seed))),
              }
            : { kind: 'scramble', moves: seededScramble(seed) },
        ),
        route = fixtureLabRoute(engine, input, bottom);
      examples.push({ id, label, input, routes: [route] });
      return examples.at(-1)!;
    };
    const rotate = add('rotation', '01 · Physical rotation and visible pair', 117);
    expect(rotate.routes[0].score.rated && rotate.routes[0].score.R > 0).toBe(true);
    const tradeoff = add('near-cross', '02 · Shortest versus near-shortest cross', 1),
      budget = createLabBudget({ now: () => 0 });
    const frame = createLabFrame(engine, tradeoff.input, { bottom: 'white', front: 'green' });
    outer: for (const cross of exploreCross(engine, tradeoff.input, frame, context.table, budget, {
      extraLengths: [1, 2],
      maxCompletions: 12,
    }))
      if (cross.kind === 'cross')
        for (const end of planLabF2L(engine, cross.candidate, context.profiles, budget))
          if (end.kind === 'f2l') {
            tradeoff.routes.push(finalizeLabRoute(context, tradeoff.input, end));
            break outer;
          }
    expect(tradeoff.routes).toHaveLength(2);
    expect(tradeoff.routes[1].crossLength).toBeGreaterThan(tradeoff.routes[1].crossMinimum);
    const grip = add('continuity', '03 · Cross-to-first-pair hand continuity', 2);
    expect(grip.routes[0].score.rated && grip.routes[0].score.G > 0).toBe(true);
    let rear = false,
      wrong = false;
    for (let seed = 1; seed <= 100 && (!rear || !wrong); seed++) {
      const input = prepareLabInput(engine, { kind: 'scramble', moves: seededScramble(seed) }),
        route = fixtureLabRoute(engine, input);
      if (
        !rear &&
        route.actions.some((a) => a.section === 'lab-f2l' && a.pair?.slot.includes('B'))
      ) {
        examples.push({
          id: 'rear',
          label: '04 · Rear-slot observation and insertion',
          input,
          routes: [route],
        });
        rear = true;
      }
      if (
        !wrong &&
        route.actions.some(
          (a) =>
            a.section === 'lab-f2l' &&
            /extract|wrong.slot|trapped/i.test(
              a.recognition + ' ' + a.explanation + ' ' + a.ruleId,
            ),
        )
      ) {
        examples.push({
          id: 'wrong-slot',
          label: '05 · Wrong-slot extraction',
          input,
          routes: [route],
        });
        wrong = true;
      }
    }
    expect(rear).toBe(true);
    expect(wrong).toBe(true);
    add('non-white', '06 · Non-white bottom and physical colors', 2, 'red');
    add('colors', '07 · Six-face input and original setup', 2, 'yellow', true);
    const experiments = examples
      .map((example) => {
        const routes = example.routes.map((r) =>
          validateLabRoute(context, example.input, r, 'current'),
        );
        const e = structuredClone(
          createExperiment(
            {
              requestId: 1,
              phase: 'stopped',
              inputFingerprint: example.input.fingerprint,
              routes,
              settings: {
                allowedColors: [example.routes[0].startHold.bottom],
                modelVersion: 'lab-execution-v1',
              },
              coverage: {
                elapsedMs: 0,
                operations: 0,
                colors: {},
                crossCompletions: example.routes.length,
                f2lCompletions: example.routes.length,
                rejectedCandidates: 0,
                entryHighWater: 0,
                reason: 'cancelled',
              },
            },
            routes.map((v) => v.route.id),
            example.label,
          ),
        );
        e.id = 'physical-review-' + example.id;
        e.createdAt = '2026-10-14T00:00:00.000Z';
        e.provenance = 'Automated fixture; no physical trial results';
        return e;
      })
      .sort((a, b) => a.label!.localeCompare(b.label!));
    const transfer: LabTransferFile = {
      schemaVersion: 1,
      exportedAt: '2026-10-14T00:00:00.000Z',
      ...emptyLabData(),
      experiments,
      pending: [],
    };
    assertTransfer(transfer);
    mkdirSync('docs/lab', { recursive: true });
    writeFileSync(path, JSON.stringify(transfer) + '\n');
  }
  const transfer: unknown = JSON.parse(readFileSync(path, 'utf8'));
  assertTransfer(transfer);
  expect(transfer.experiments).toHaveLength(7);
  expect(transfer.attempts).toHaveLength(0);
  for (const e of transfer.experiments)
    await expect(verifyExperiment(context, e)).resolves.toHaveLength(e.routes.length);
}, 60000);
