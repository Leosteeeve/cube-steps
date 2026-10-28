import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useGuidanceTarget } from '../../ui/guidance';
import { useOptionalClubTutorial } from '../tutorial/TutorialProvider';
import { TourEntry } from '../tutorial/TourEntry';
import { createTutorialInputGate, timerTutorialAllowed } from './tutorial-input';
import type { CubeEngine } from '../../core/types';
import type { TimerRepository } from './repository';
import { useTimer } from './use-timer';
import { loadTimerSettings, saveTimerSettings, resetTimerSettings } from './settings';
import { TimerSurface } from './TimerSurface';
import { ScrambleNet } from './ScrambleNet';
import { effectiveResult, summarizeHistory, orderedAttempts } from './statistics';
import { formatResult } from './format';
import { TimerHistory } from './TimerHistory';
import { TimerTrend } from './TimerTrend';
import { downloadTimerExport, exportTimerCsv, exportTimerJson } from './export';
import './timer.css';
export function TimerPage({
  engine,
  repository,
}: {
  engine: CubeEngine;
  repository: TimerRepository;
}) {
  const [initial] = useState(() => loadTimerSettings(() => localStorage));
  const [settingsSaved, setSettingsSaved] = useState(initial.available && initial.writable);
  const [protectedSettings, setProtectedSettings] = useState(!initial.writable);
  const [inputGate] = useState(createTutorialInputGate),
    tutorial = useOptionalClubTutorial();
  const { state, controller, history } = useTimer({
    engine,
    repository,
    settings: initial.value,
    inputGate,
  });
  const registerGuard = tutorial?.registerGuard,
    registerInputLock = tutorial?.registerInputLock;
  useLayoutEffect(
    () => registerGuard?.(() => timerTutorialAllowed(controller.snapshot(), repository.snapshot())),
    [registerGuard, controller, repository],
  );
  useLayoutEffect(() => registerInputLock?.(inputGate.setLocked), [registerInputLock, inputGate]);
  useEffect(() => () => inputGate.dispose(), [inputGate]);
  const scrambleTarget = useGuidanceTarget('timer.scramble', state.phase === 'idle'),
    settingsTarget = useGuidanceTarget('timer.settings'),
    historyTarget = useGuidanceTarget('timer.history'),
    exportTarget = useGuidanceTarget('timer.export');
  const stats = useMemo(() => summarizeHistory(history.attempts), [history.attempts]),
    active = ['inspection', 'arming', 'running', 'stopped'].includes(state.phase);
  const last = useMemo(() => orderedAttempts(history.attempts).at(-1), [history.attempts]);
  return (
    <div className="club-timer" data-phase={state.phase}>
      <TourEntry tourId="timer" ready={timerTutorialAllowed(state, history)} />
      <div className="timer-title">
        <div>
          <p className="club-kicker">Your practice desk</p>
          <h1>
            Your time.
            <br />
            <em>Your progress.</em>
          </h1>
        </div>
        <span className="timer-badge">
          3 × 3<br />
          <small>Free practice</small>
        </span>
      </div>
      <div className="timer-workspace">
        <section className="timer-main-card" aria-label="Cube timer">
          <div ref={scrambleTarget} className="timer-scramble">
            <div className="timer-card-heading">
              <span>3 × 3 / SCRAMBLE</span>
              <button
                onClick={() => void controller.newScramble()}
                disabled={active || state.phase === 'loading'}
              >
                New scramble
              </button>
            </div>
            {'prepared' in state ? (
              <p className="timer-scramble-text">{state.prepared.text}</p>
            ) : (
              <p className="timer-scramble-text">
                {state.phase === 'error' ? 'Scramble unavailable.' : 'Generating a fresh scramble…'}
              </p>
            )}
            {state.phase === 'error' && (
              <div role="alert">
                <p>{state.message}</p>
                <button onClick={() => void controller.newScramble()}>Retry scramble</button>
              </div>
            )}
          </div>
          <TimerSurface
            state={{ ...state, lastAttempt: last }}
            dispatch={controller.dispatch}
            inputGate={inputGate}
          />
          <div ref={settingsTarget} className="timer-options">
            <label>
              <input
                type="checkbox"
                checked={state.settings.inspectionEnabled}
                disabled={active}
                onChange={(e) => {
                  const enabled = e.target.checked;
                  controller.setInspection(enabled);
                  setSettingsSaved(
                    saveTimerSettings(() => localStorage, {
                      version: 1,
                      inspectionEnabled: enabled,
                    }),
                  );
                }}
              />
              15-second inspection
            </label>
            <details>
              <summary>How timing works</summary>
              <p>
                Inspection: under 15 seconds is clear, 15–17 seconds adds 2 seconds, and 17 seconds
                or more is DNF. The penalty is checked when you release to start.
              </p>
              <p>
                Escape cancels preparation. Leaving, hiding or losing focus during a solve records
                an interrupted DNF. Hard browser termination may prevent saving.
              </p>
            </details>
          </div>
          {!settingsSaved && (
            <p className="timer-notice">
              Settings are only in memory.
              {protectedSettings && (
                <>
                  {' '}
                  Incompatible saved settings were preserved.{' '}
                  <button
                    onClick={() => {
                      const saved = resetTimerSettings(() => localStorage);
                      setSettingsSaved(saved);
                      if (saved) {
                        setProtectedSettings(false);
                        controller.setInspection(false);
                      }
                    }}
                  >
                    Reset timer settings
                  </button>
                </>
              )}
            </p>
          )}
        </section>
        <aside className="timer-net-card">
          <h2>Check your scramble</h2>
          <p>Match the stickers to the six-face view.</p>
          {'prepared' in state ? (
            <ScrambleNet facelets={state.prepared.facelets} label="Current scramble diagram" />
          ) : (
            <p className="timer-net-wait">Your diagram will appear with the scramble.</p>
          )}
        </aside>
      </div>
      {last && (
        <p className="timer-last" role="status">
          Last result: <strong>{formatResult(effectiveResult(last))}</strong>
          {last.interruption ? ' · Interrupted solve (DNF)' : ''}
          {last.inspectionPenalty !== 'none'
            ? ` · Inspection ${last.inspectionPenalty === 'plus2' ? '+2' : 'DNF'}`
            : ''}{' '}
          {last.manualPenalty !== 'none'
            ? ` · Manual ${last.manualPenalty === 'plus2' ? '+2' : 'DNF'}`
            : ''}{' '}
          · {history.pendingIds.includes(last.id) ? 'Not saved' : 'Saved on this device'}
        </p>
      )}
      {history.error && (
        <div className="timer-notice" role="status">
          <p>{history.error}</p>
          {history.pendingIds.map((id) => (
            <button key={id} onClick={() => void repository.retry(id)}>
              Retry saving result
            </button>
          ))}
          {!history.pendingIds.length && (
            <button onClick={() => void repository.refresh()}>Reload history</button>
          )}
        </div>
      )}
      <section className="timer-stats" aria-label="Practice statistics">
        <div>
          <small>SOLVES</small>
          <strong>{stats.count}</strong>
          <span>
            {stats.count} {stats.count === 1 ? 'solve' : 'solves'}
          </span>
        </div>
        <div className="timer-best">
          <small>PERSONAL BEST</small>
          <strong>{formatResult(stats.best)}</strong>
        </div>
        <div>
          <small>AVERAGE OF 5</small>
          <strong>{formatResult(stats.ao5)}</strong>
          {stats.count < 5 && <span>{5 - stats.count} more solves needed</span>}
        </div>
        <div>
          <small>AVERAGE OF 12</small>
          <strong>{formatResult(stats.ao12)}</strong>
          {stats.count < 12 && <span>{12 - stats.count} more solves needed</span>}
        </div>
      </section>
      <div ref={historyTarget} className="timer-bottom-grid">
        <TimerTrend attempts={history.attempts} />
        <TimerHistory repository={repository} engine={engine} />
      </div>
      <div ref={exportTarget} className="timer-export">
        <div>
          <strong>Your practice, on this device.</strong>
          <p>
            History stays in this browser. Export a backup before clearing browser data or changing
            devices. Unsaved results are included and labeled.
          </p>
        </div>
        <div className="timer-export-actions">
          <button
            onClick={() =>
              downloadTimerExport(exportTimerCsv(history.attempts, history.pendingIds), 'csv')
            }
          >
            Export CSV
          </button>
          <button
            onClick={() =>
              downloadTimerExport(
                exportTimerJson(history.attempts, new Date().toISOString(), history.pendingIds),
                'json',
              )
            }
          >
            Export JSON
          </button>
        </div>
      </div>
    </div>
  );
}
