import type { TimerResult } from './types';
export function formatResult(result: TimerResult): string {
  if (result.kind === 'dnf') return 'DNF';
  if (result.kind === 'insufficient') return '—';
  const hundredths = Math.round(result.ms / 10),
    minutes = Math.floor(hundredths / 6000),
    seconds = Math.floor(hundredths / 100) % 60,
    fraction = String(hundredths % 100).padStart(2, '0');
  return (
    (minutes ? minutes + ':' + String(seconds).padStart(2, '0') : String(seconds)) + '.' + fraction
  );
}
