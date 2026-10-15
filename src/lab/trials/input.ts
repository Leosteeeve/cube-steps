export function isTrialInputTarget(target: EventTarget | null): boolean {
  const element =
    target instanceof Element ? target : target instanceof Node ? target.parentElement : null;
  return !!element?.closest(
    'input,textarea,select,button,a,summary,label,[contenteditable]:not([contenteditable="false"]),[role="button"],[role="textbox"],[role="combobox"],[role="slider"],[role="checkbox"],[role="switch"]',
  );
}
export function shouldHandleTrialKey(
  event: Pick<
    KeyboardEvent,
    'code' | 'repeat' | 'ctrlKey' | 'altKey' | 'metaKey' | 'shiftKey' | 'target'
  >,
  locked: boolean,
) {
  return (
    !locked &&
    event.code === 'Space' &&
    !event.repeat &&
    !event.ctrlKey &&
    !event.altKey &&
    !event.metaKey &&
    !event.shiftKey &&
    !isTrialInputTarget(event.target)
  );
}
/** Only elapsed differences from this clock enter browser trial durations. */
export const trialNow = () => performance.now();
