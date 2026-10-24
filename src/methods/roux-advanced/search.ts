import type { CubeEngine } from '../../core/types';
import type {
  AdvancedRouxOutcome,
  RouxCoverage,
  RouxRoute,
  RouxSettings,
} from '../../roux-lab/types';
import { freezeLabValue } from '../../lab/input';
import { selectRouxFrames } from './frames';
import { RouxBudgetStop } from './budget';
import { advancedRouxAssetBytes, type AdvancedRouxAssets } from './assets';
import { planBaselineBlocks } from './blocks/baseline';
import { searchFirstBlockReference } from './blocks/reference';
import { generateFirstBlocks } from './blocks/candidates';
import { continueSecondBlock } from './blocks/second-block';
import { completeRouxCandidate } from './complete';
import { rouxTraceMetadata } from './finalize';
import { selectRouxRoutes } from './selection';
import type { FirstBlockEvidence, RouxFrame, RouxInput, RouxSearchBudget } from './types';
type Event =
  | { kind: 'work' }
  | { kind: 'result'; route: RouxRoute }
  | { kind: 'progress'; coverage: RouxCoverage };
export function* searchAdvancedRoux(
  e: CubeEngine,
  input: RouxInput,
  settings: RouxSettings,
  assets: AdvancedRouxAssets,
  budget: RouxSearchBudget,
): Generator<Event, AdvancedRouxOutcome> {
  const evidence: RouxCoverage['frames'] = {},
    retained: RouxRoute[] = [],
    jobs: Generator<Event, void>[] = [];
  let verifiedRoutes = 0,
    reason: RouxCoverage['reason'];
  const coverage = (): RouxCoverage => ({
    ...budget.snapshot(),
    frames: { ...evidence },
    verifiedRoutes,
    ...(reason ? { reason } : {}),
  });
  const accept = (route: RouxRoute) => {
    verifiedRoutes++;
    const prior = evidence[route.frameId];
    if (!prior || prior.status === 'not-explored') evidence[route.frameId] = route.evidence;
    const candidates = [...retained.filter((r) => r.id !== route.id), route];
    const selected = selectRouxRoutes(candidates, evidence, 4);
    // Keep a separate allowed-frame fallback even when it is not the normal-page recommendation.
    const fallback = candidates.find((r) => r.basis === 'baseline-fallback');
    if (fallback && !selected.includes(fallback)) selected.push(fallback);
    for (const r of retained) if (!selected.includes(r)) budget.release(`route/${r.id}`);
    for (const r of selected) budget.retain(`route/${r.id}`, 2 * JSON.stringify(r).length + 4096);
    retained.splice(0, retained.length, ...selected);
  };
  function* frameJob(frame: RouxFrame): Generator<Event, void> {
    const blocks = yield* planBaselineBlocks(e, input, frame, assets.beginner, budget);
    const raw = completeRouxCandidate(e, input, frame, blocks, assets, budget),
      fallback: RouxRoute = {
        ...raw,
        basis: 'baseline-fallback',
        trace: { ...raw.trace },
      };
    fallback.trace.rouxAdvanced = rouxTraceMetadata(fallback);
    // Complete/verified results remain usable if optional continuation consumed the final budget.
    if (budget.snapshot().reason) {
      retained.push(freezeLabValue(fallback));
      verifiedRoutes++;
      evidence[frame.id] = fallback.evidence;
      yield { kind: 'result', route: fallback };
      return;
    }
    accept(freezeLabValue(fallback));
    yield { kind: 'result', route: fallback };
    if (raw.counts.combined === 0) return;
    const reference = searchFirstBlockReference(
        e,
        input,
        frame,
        assets.blocks,
        budget,
        blocks.first.moves,
      ),
      candidates = generateFirstBlocks(
        e,
        input,
        frame,
        assets.blocks,
        budget,
        Math.min(30, blocks.first.moves.length + 2),
      );
    let referenceDone = false,
      candidatesDone = false;
    try {
      while (!referenceDone || !candidatesDone) {
        budget.checkpoint();
        if (!referenceDone) {
          const next = reference.next();
          referenceDone = !!next.done;
          const update: FirstBlockEvidence | undefined = next.done
            ? next.value
            : next.value.kind === 'evidence'
              ? next.value.evidence
              : undefined;
          if (update) {
            evidence[frame.id] = update;
            yield { kind: 'progress', coverage: coverage() };
          } else yield { kind: 'work' };
        }
        if (!candidatesDone) {
          const next = candidates.next();
          candidatesDone = !!next.done;
          if (!next.done && next.value.kind === 'block') {
            // Consume a complete first block immediately, before generating more.
            const continuation = continueSecondBlock(
              e,
              next.value.candidate,
              frame,
              assets.blocks,
              budget,
            );
            try {
              for (const step of continuation) {
                if (step.kind === 'work') {
                  yield step;
                  continue;
                }
                const route = completeRouxCandidate(
                  e,
                  input,
                  frame,
                  step.candidate,
                  assets,
                  budget,
                );
                if (budget.snapshot().reason) return;
                accept(route);
                yield { kind: 'result', route };
              }
            } finally {
              continuation.return();
            }
          } else yield { kind: 'work' };
        }
      }
    } finally {
      reference.return({ status: 'not-explored' });
      candidates.return();
    }
  }
  try {
    if (settings.modelVersion !== 'roux-execution-v1' || settings.mode !== budget.mode)
      throw Error('Unsupported Roux model or search mode.');
    const frames = selectRouxFrames(settings.allowedFrames);
    budget.retain('static-assets', advancedRouxAssetBytes(assets));
    // First deliver one fallback. Thereafter selected colors share the remaining work fairly.
    const first = frameJob(frames[0]);
    jobs.push(first);
    for (;;) {
      const step = first.next();
      if (step.done) {
        jobs.pop();
        break;
      }
      yield step.value;
      if (step.value.kind === 'result') break;
    }
    for (const frame of frames.slice(1)) jobs.push(frameJob(frame));
    while (jobs.length) {
      for (let i = 0; i < jobs.length;) {
        budget.checkpoint();
        const next = jobs[i].next();
        if (next.done) jobs.splice(i, 1);
        else {
          yield next.value;
          i++;
        }
      }
    }
    reason = budget.snapshot().reason ?? 'complete';
  } catch (error) {
    reason = error instanceof RouxBudgetStop ? error.reason : 'error';
    if (!retained.length)
      return {
        ok: false,
        code: error instanceof RouxBudgetStop ? 'budget' : 'verification',
        message: error instanceof Error ? error.message : 'Roux route failed verification.',
        coverage: coverage(),
      };
  } finally {
    for (const job of jobs) job.return();
  }
  const routes = selectRouxRoutes(retained, evidence, settings.mode === 'normal' ? 1 : 4);
  return routes.length
    ? { ok: true, routes, coverage: coverage() }
    : {
        ok: false,
        code: 'unsupported-case',
        message: 'No complete verified Roux route was retained.',
        coverage: coverage(),
      };
}
