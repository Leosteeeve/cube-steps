import { useEffect, useMemo, useState } from 'react';
import { stateToFacelets } from '../../core/facelets';
import { createRouxComparison as createComparison } from '../../roux-lab/experiments/snapshots';
import { ROUX_FRAMES } from '../../methods/roux-advanced/frames';
import type { RouxExperiment } from '../../roux-lab/experiments/types';
import {
  createRouxComparisonBlocks as createComparisonBlocks,
  selectEligibleRouxAttempts as selectEligibleAttempts,
} from '../../roux-lab/trials/blocks';
import { summarizeRouxComparison as summarizeComparison } from '../../roux-lab/trials/summary';
import type { TimingMethod } from '../../lab/experiments/types';
import type {
  RouxTrialConditions as TrialConditions,
  RouxTrialDraft as TrialDraft,
  RouxTrialMemory as TrialMemory,
} from '../../roux-lab/trials/types';
import { useRouxNotebook } from './RouxNotebookProvider';
import { LabCubeNet } from '../lab/LabCubeNet';
import { TrialTimer } from './TrialTimer';
import { TrialHistory } from './TrialHistory';
import { ComparisonSummary } from './ComparisonSummary';
const testerKey = 'cubesteps.club.roux-lab.tester.v1';
function localTester() {
  try {
    const previous = localStorage.getItem(testerKey);
    if (previous && /^[A-Za-z0-9-]{1,128}$/.test(previous)) return previous;
    const id = crypto.randomUUID();
    localStorage.setItem(testerKey, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}
type Props = {
  active: boolean;
  memory: TrialMemory;
  selectedExperimentId: string | null;
  quiesce: () => void;
  onLock: (locked: boolean) => void;
  onStudy: (experiment: RouxExperiment, routeId: string) => Promise<void>;
};
export function TrialsPage(props: Props) {
  const notebook = useRouxNotebook();
  return notebook ? (
    <Ready {...props} notebook={notebook} />
  ) : (
    <p role="status">Opening trial notebook…</p>
  );
}
function Ready({
  active,
  memory,
  selectedExperimentId,
  quiesce,
  onLock,
  onStudy,
  notebook,
}: Props & { notebook: NonNullable<ReturnType<typeof useRouxNotebook>> }) {
  const { records, repository } = notebook,
    prior = memory.current?.conditions;
  const [experimentId, setExperimentId] = useState(prior?.experimentId ?? ''),
    [comparisonId, setComparisonId] = useState(prior?.comparisonId ?? ''),
    [routeId, setRouteId] = useState(prior?.routeId ?? ''),
    [slotId, setSlotId] = useState(prior?.slot ?? '');
  const [testerId, setTesterId] = useState(prior?.testerId ?? localTester),
    [testerLabel, setTesterLabel] = useState(''),
    [method, setMethod] = useState<TimingMethod>(prior?.timingMethod ?? 'keyboard'),
    [kind, setKind] = useState<'warmup' | 'measured'>(prior?.kind ?? 'warmup'),
    [aId, setAId] = useState(''),
    [bId, setBId] = useState('');
  const [timing, setTiming] = useState(false),
    [review, setReview] = useState(memory.current?.status === 'review'),
    [saving, setSaving] = useState(false),
    [error, setError] = useState('');
  const locked = timing || review || saving,
    e = records.experiments.find((e) => e.id === experimentId);
  useEffect(() => {
    if (!experimentId && !locked)
      setExperimentId(selectedExperimentId ?? records.experiments[0]?.id ?? '');
  }, [experimentId, locked, records.experiments, selectedExperimentId]);
  const comparisons = records.comparisons.filter((c) => c.experimentId === e?.id),
    comparison = comparisons.find((c) => c.id === comparisonId),
    blocks = records.trialBlocks
      .filter((b) => b.comparisonId === comparison?.id)
      .sort((a, b) => a.ordinal - b.ordinal),
    attempts = records.attempts.filter((a) => a.experimentId === e?.id);
  const relevant = attempts.filter((a) => a.testerId === testerId && a.timingMethod === method),
    selection = selectEligibleAttempts(relevant, blocks);
  const ordered = blocks.flatMap((b) =>
    (b.intendedOrder === 'AB' ? b.slots : [b.slots[1], b.slots[0]]).map((slot) => ({
      block: b,
      slot,
    })),
  );
  const pendingSlots = ordered.filter(
      (x) => !selection.slots.find((s) => s.slotId === x.slot.id)?.attempt,
    ),
    chosen = ordered.find((x) => x.slot.id === slotId) ?? pendingSlots[0];
  const route =
    e?.routes.find((r) => r.id === (comparison ? chosen?.slot.routeId : routeId)) ??
    (!comparison ? e?.routes[0] : undefined);
  const original =
    comparison && chosen
      ? relevant
          .filter(
            (a) =>
              a.blockId === chosen.block.id && a.slot === chosen.slot.id && a.kind === 'measured',
          )
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
          .at(-1)
      : undefined;
  const conditions = useMemo<TrialConditions | undefined>(
    () =>
      e && route
        ? {
            experimentId: e.id,
            routeId: route.id,
            testerId,
            timingMethod: method,
            endpoint: 'roux-blocks',
            method: 'roux-advanced',
            kind,
            ...(comparison && chosen
              ? {
                  comparisonId: comparison.id,
                  blockId: chosen.block.id,
                  slot: chosen.slot.id,
                  intendedOrder: chosen.block.intendedOrder,
                  actualOrder: relevant.filter((a) => a.blockId === chosen.block.id).length + 1,
                  ...(original ? { retryOf: original.id } : {}),
                }
              : {}),
          }
        : undefined,
    [
      e,
      route,
      testerId,
      method,
      kind,
      comparison,
      chosen?.block.id,
      chosen?.slot.id,
      relevant.length,
      original?.id,
    ],
  );
  const run = async (fn: () => Promise<unknown>) => {
    setSaving(true);
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };
  async function createPair() {
    if (!e) return;
    const a = aId || e.routes[0]?.id,
      b = bId || e.routes[1]?.id;
    if (!a || !b) return;
    const c = createComparison(e, a, b);
    await repository.saveComparison(c);
    await repository.saveBlocks(createComparisonBlocks(c, 5));
    setComparisonId(c.id);
    setSlotId('');
  }
  async function saveTrial(draft: TrialDraft, id: string, createdAt: string) {
    if (!draft.outcome) throw Error('Choose the trial outcome.');
    if (records.attempts.some((a) => a.id === id)) return;
    await repository.saveAttempt(
      {
        ...draft,
        outcome: draft.outcome,
        schemaVersion: 1,
        id,
        revision: 0,
        previousRevision: null,
        createdAt,
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      },
      null,
    );
    setSlotId('');
  }
  async function study() {
    if (!e || !route) return;
    quiesce();
    await onStudy(e, route.id);
  }
  const frame = ROUX_FRAMES.find((f) => f.id === route?.frameId);
  useEffect(() => {
    onLock(timing || review);
    return () => onLock(false);
  }, [timing, review, onLock]);
  if (!records.experiments.length)
    return (
      <section className="roux-card">
        <h2>Trials & notes</h2>
        <p>
          First save a verified experiment in Analyze or Compare. Trials use those fixed routes, so
          later searches cannot change the basis of your results.
        </p>
        <a href="#/roux-lab">Open Analyze</a>
      </section>
    );
  return (
    <div className="roux-notebook">
      <section className="roux-card">
        <h2>A small experiment, in your hands.</h2>
        <p>
          Unlimited practice first. Compare one tester, timing method and exact route pair at a
          time.
        </p>
        <fieldset disabled={locked}>
          <legend>Trial conditions</legend>
          <label>
            Trial experiment
            <select
              value={experimentId}
              onChange={(event) => {
                setExperimentId(event.target.value);
                setComparisonId('');
                setSlotId('');
                setRouteId('');
                setAId('');
                setBId('');
              }}
            >
              {records.experiments.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.label || e.createdAt}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tester
            <select
              value={testerId}
              onChange={(event) => {
                setTesterId(event.target.value);
                try {
                  localStorage.setItem(testerKey, event.target.value);
                } catch {}
                setSlotId('');
              }}
            >
              <option value={testerId}>
                {records.testers.find((t) => t.id === testerId)?.label || 'This anonymous tester'}
              </option>
              {records.testers
                .filter((t) => t.id !== testerId)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label || `Anonymous ${t.id.slice(0, 8)}`}
                  </option>
                ))}
            </select>
          </label>
          <label>
            New tester label (optional)
            <input
              maxLength={60}
              value={testerLabel}
              onChange={(event) => setTesterLabel(event.target.value)}
            />
          </label>
          <button
            onClick={() =>
              void run(async () => {
                const id = crypto.randomUUID();
                await repository.saveTester({
                  id,
                  ...(testerLabel.trim() ? { label: testerLabel.trim() } : {}),
                });
                setTesterId(id);
                setSlotId('');
                setTesterLabel('');
                try {
                  localStorage.setItem(testerKey, id);
                } catch {}
              })
            }
          >
            Add separate tester
          </button>
          <label>
            Timing method
            <select
              value={method}
              onChange={(event) => {
                setMethod(event.target.value as TimingMethod);
                setSlotId('');
              }}
            >
              <option value="keyboard">Keyboard</option>
              <option value="touch">Touch pad</option>
              <option value="external-manual">External timer / manual entry</option>
            </select>
          </label>
          <label>
            Attempt kind
            <select value={kind} onChange={(event) => setKind(event.target.value as typeof kind)}>
              <option value="warmup">Warmup / familiarization</option>
              <option value="measured">Measured attempt</option>
            </select>
          </label>
          <label>
            Comparison
            <select
              value={comparisonId}
              onChange={(event) => {
                setComparisonId(event.target.value);
                setSlotId('');
              }}
            >
              <option value="">Exploratory single route</option>
              {comparisons.map((c) => (
                <option key={c.id} value={c.id}>
                  A/B {c.id.slice(0, 8)}
                </option>
              ))}
            </select>
          </label>
          {comparison && !blocks.length && (
            <button
              onClick={() =>
                void run(() => repository.saveBlocks(createComparisonBlocks(comparison, 5)))
              }
            >
              Plan five alternating blocks
            </button>
          )}
          {comparison ? (
            <label>
              Planned block slot
              <select
                value={chosen?.slot.id ?? ''}
                onChange={(event) => setSlotId(event.target.value)}
              >
                {ordered.map(({ block, slot }) => (
                  <option key={slot.id} value={slot.id}>
                    Block {block.ordinal} · {block.intendedOrder} · {slot.label}
                    {selection.slots.find((s) => s.slotId === slot.id)?.attempt ? ' (filled)' : ''}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label>
              Trial route
              <select value={route?.id ?? ''} onChange={(event) => setRouteId(event.target.value)}>
                {e?.routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.frameId.replace('-', ' bottom / ')} left · {r.id.slice(-8)}
                  </option>
                ))}
              </select>
            </label>
          )}
          {comparison && !pendingSlots.length && (
            <button
              onClick={() =>
                void run(async () => {
                  const extra = createComparisonBlocks(comparison, 2).map((b, i) => ({
                    ...b,
                    ordinal: Math.max(0, ...blocks.map((b) => b.ordinal)) + i + 1,
                    intendedOrder:
                      (Math.max(0, ...blocks.map((b) => b.ordinal)) + i) % 2
                        ? ('BA' as const)
                        : ('AB' as const),
                  }));
                  await repository.saveBlocks(extra);
                  setSlotId('');
                })
              }
            >
              Add two comparison blocks
            </button>
          )}
          {e && e.routes.length >= 2 && comparisons.length < 6 && (
            <details>
              <summary>Create a fixed A/B comparison</summary>
              <label>
                Route A
                <select
                  value={aId || e.routes[0].id}
                  onChange={(event) => setAId(event.target.value)}
                >
                  {e.routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.frameId}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Route B
                <select
                  value={bId || e.routes[1].id}
                  onChange={(event) => setBId(event.target.value)}
                >
                  {e.routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.frameId}
                    </option>
                  ))}
                </select>
              </label>
              <button onClick={() => void run(createPair)}>
                Create comparison and five blocks
              </button>
              <p>A/B identities and planned slots are saved before timing begins.</p>
            </details>
          )}
        </fieldset>
        {review && (
          <p role="status">Finish or discard the retained review before changing conditions.</p>
        )}
        {error && <p role="alert">{error}</p>}
      </section>
      {e && route && conditions && (
        <div className="roux-trial-work">
          <section className="roux-card roux-trial-setup">
            <h2>Set up the saved cube</h2>
            <p>
              From a solved cube in the diagram hold, apply:{' '}
              <code>{e.setupMoves.join(' ') || 'Already solved'}</code>
            </p>
            <LabCubeNet
              facelets={stateToFacelets(route.trace.initial)}
              label="Saved trial cube six-face diagram"
            />
            <p>
              Initial positioning, before timing:{' '}
              <code>{frame?.positioningMoves.join(' ') || 'None'}</code>. Start with{' '}
              <strong>
                {frame?.bottom} down and {frame?.left} on the left
              </strong>
              , neutral wrists and both hands supporting the cube.
            </p>
            <button disabled={locked} onClick={() => void run(study)}>
              Study this route in the player
            </button>
            <details>
              <summary>Holds, formulas and estimated hand instructions</summary>
              <p>{e.versions.model} · estimates await physical calibration.</p>
              <ol>
                {route.trace.stages
                  .filter((s) => ['ar-first-block', 'ar-second-block'].includes(s.id))
                  .flatMap((s) => s.actions)
                  .map((a, i) => (
                    <li key={i}>
                      {a.recognition} <code>{a.moves.join(' ')}</code> {a.explanation}
                    </li>
                  ))}
              </ol>
              {route.score.rated && (
                <ul>
                  {route.score.events
                    .filter((x) => x.kind !== 'turn')
                    .map((x, i) => (
                      <li key={i}>
                        At playback move {x.boundary}: {x.instruction}
                      </li>
                    ))}
                </ul>
              )}
            </details>
            {original && (
              <p>
                This open slot links a new retry to the previous attempt; the original stays
                visible.
              </p>
            )}
          </section>
          <TrialTimer
            route={route}
            conditions={conditions}
            active={active}
            memory={memory}
            quiesce={quiesce}
            onActivity={setTiming}
            onReview={setReview}
            onSave={saveTrial}
          />
        </div>
      )}
      {comparison && (
        <ComparisonSummary
          summary={summarizeComparison(comparison, testerId, method, blocks, attempts)}
        />
      )}
      {e && (
        <TrialHistory
          attempts={attempts}
          experiment={e}
          repository={repository}
          disabled={locked}
        />
      )}
    </div>
  );
}
