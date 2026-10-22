import { expect, it } from 'vitest';
import { createCubeEngine } from '../src/core/cube';
import { stateToFacelets, validateFacelets } from '../src/core/facelets';
import { solveRoux } from '../src/methods/roux/solve';
import { handleSolveMessage } from '../src/workers/solve-request';
import { seededScramble } from './fixtures/lbl-cases';
import { assertCompleteRouxTrace, loadTestRouxAssets } from './helpers/roux';
it('validates and solves color snapshots from independent seeds 2001-2100', async () => {
  const e = await createCubeEngine(),
    assets = await loadTestRouxAssets();
  for (let seed = 2001; seed <= 2100; seed++) {
    const initial = e.apply(e.solved(), seededScramble(seed)),
      facelets = stateToFacelets(initial),
      checked = validateFacelets(facelets, e.solved());
    if (!checked.ok) throw Error(`color seed ${seed}: ${JSON.stringify(checked.issues)}`);
    const r = solveRoux(e, checked.state, assets);
    if (!r.ok)
      throw Error(`color seed ${seed}: ${r.stageId}: ${r.message}; ${JSON.stringify(facelets)}`);
    assertCompleteRouxTrace(e, checked.state, r.trace);
    const fromScramble = solveRoux(e, initial, assets);
    if (!fromScramble.ok) throw Error(fromScramble.message);
    const reply = await handleSolveMessage(
      e,
      {
        requestId: seed,
        method: 'roux-beginner',
        edition: 'club',
        input: { kind: 'facelets', facelets },
      },
      undefined,
      async () => ({ solve: solveRoux, assets }),
    );
    expect(reply).toMatchObject({
      requestId: seed,
      result: {
        ok: true,
        session: { input: { kind: 'facelets', facelets }, trace: { method: 'roux-beginner' } },
      },
    });
    if (!reply?.result.ok) throw Error(`Worker rejected color seed ${seed}`);
    expect(reply.result.session.trace).toEqual(r.trace);
    expect(
      r.trace.stages.map((s) =>
        s.actions.map((a) => ({
          moves: a.moves,
          caseId: a.caseId,
          targets: a.targets,
          roux: a.roux,
        })),
      ),
    ).toEqual(
      fromScramble.trace.stages.map((s) =>
        s.actions.map((a) => ({
          moves: a.moves,
          caseId: a.caseId,
          targets: a.targets,
          roux: a.roux,
        })),
      ),
    );
  }
}, 180000);
