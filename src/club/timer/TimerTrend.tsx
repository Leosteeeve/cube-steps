import { memo, useMemo, useState } from 'react';
import { buildTrend } from './statistics';
import { formatResult } from './format';
import type { TimerAttempt } from './types';
type Series = 'single' | 'ao5' | 'ao12';
const labels = { single: 'Solve time', ao5: 'Average of 5', ao12: 'Average of 12' };
export const TimerTrend = memo(function TimerTrend({
  attempts,
}: {
  attempts: readonly TimerAttempt[];
}) {
  const points = useMemo(() => buildTrend(attempts), [attempts]);
  const [series, setSeries] = useState<Series>('single'),
    [selected, setSelected] = useState('');
  const chosen = points.find((p) => p.id === selected) ?? points.at(-1);
  const values = points.flatMap((p) => (p[series].kind === 'time' ? [p[series].ms / 1000] : [])),
    max = Math.max(1, ...values) * 1.1;
  const x = (i: number) =>
      48 + (points.length === 1 ? 212 : (i * 424) / Math.max(1, points.length - 1)),
    y = (ms: number) => 210 - (ms / 1000 / max) * 174;
  let path = '';
  let drawing = false;
  points.forEach((p, i) => {
    const result = p[series];
    if (result.kind === 'time') {
      path += `${drawing ? 'L' : 'M'}${x(i)},${y(result.ms)} `;
      drawing = true;
    } else drawing = false;
  });
  return (
    <section className="timer-trend" aria-label="Performance trend">
      <div className="timer-card-heading">
        <h2>A little progress.</h2>
        <span>LAST {points.length} SOLVES</span>
      </div>
      <div className="timer-series" role="group" aria-label="Chart series">
        {(['single', 'ao5', 'ao12'] as Series[]).map((key) => (
          <button key={key} aria-pressed={series === key} onClick={() => setSeries(key)}>
            {key === 'single' ? 'Single' : key}
          </button>
        ))}
      </div>
      {!points.length ? (
        <div className="timer-empty">
          <strong>Your next chapter starts here.</strong>
          <p>Complete a solve to see your progress.</p>
        </div>
      ) : (
        <>
          <svg
            className="timer-chart"
            viewBox="0 0 500 258"
            role="img"
            aria-label={`${labels[series]} trend, latest ${points.length} solves`}
          >
            <title>
              {labels[series]} in seconds. Use the solve selector below for exact values.
            </title>
            {[0, 1, 2, 3].map((i) => {
              const value = (max * i) / 3,
                cy = y(value * 1000);
              return (
                <g key={i}>
                  <line x1="48" x2="478" y1={cy} y2={cy} stroke="#e6ecf3" />
                  <text x="38" y={cy + 4} textAnchor="end">
                    {value.toFixed(max < 10 ? 1 : 0)}
                  </text>
                </g>
              );
            })}
            <text x="48" y="17">
              Seconds
            </text>
            <text x="48" y="243">
              Solve {points[0].index}
            </text>
            <text x="478" y="243" textAnchor="end">
              {points.at(-1)!.index}
            </text>
            <path d={path} stroke="#2869ca" strokeWidth="2.5" fill="none" />
            {points.map((p, i) =>
              p[series].kind === 'time' ? (
                <circle
                  key={p.id}
                  data-point={p.id}
                  cx={x(i)}
                  cy={y(p[series].ms)}
                  r={p.id === chosen?.id ? 5 : 3.5}
                  fill="#fff"
                  stroke="#2869ca"
                  strokeWidth="2"
                  onMouseEnter={() => setSelected(p.id)}
                >
                  <title>
                    Solve {p.index}: {formatResult(p[series])}
                  </title>
                </circle>
              ) : null,
            )}
          </svg>
          <label className="timer-point-picker">
            Inspect a plotted solve
            <select
              aria-label="Inspect a plotted solve"
              value={chosen?.id ?? ''}
              onChange={(e) => setSelected(e.target.value)}
            >
              {points.map((p) => (
                <option key={p.id} value={p.id}>
                  Solve {p.index} · {formatResult(p[series])}
                </option>
              ))}
            </select>
          </label>
          {chosen && (
            <p className="timer-point-detail" aria-live="polite">
              Solve {chosen.index}: {formatResult(chosen[series])}
            </p>
          )}
        </>
      )}
      <p className="timer-chart-note">
        DNF and missing averages leave gaps. One solve is a moment. Look at the whole picture.
      </p>
    </section>
  );
});
