export function parseTrialDuration(
  text: string,
): { ok: true; ms: number } | { ok: false; message: string } {
  const value = text.trim();
  let seconds: number;
  if (/^\d+(?:\.\d{1,3})?$/.test(value)) seconds = Number(value);
  else if (/^\d+:\d{1,2}(?:\.\d{1,3})?$/.test(value)) {
    const [minutes, part] = value.split(':');
    if (Number(part) >= 60)
      return { ok: false, message: 'Seconds after the colon must be below 60.' };
    seconds = Number(minutes) * 60 + Number(part);
  } else
    return { ok: false, message: 'Enter positive seconds (12.34) or minutes:seconds (1:02.345).' };
  const ms = Math.round(seconds * 1000);
  return Number.isSafeInteger(ms) && ms > 0
    ? { ok: true, ms }
    : { ok: false, message: 'The duration must be positive and finite.' };
}
