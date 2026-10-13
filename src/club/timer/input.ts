export function isTimerKeyTarget(target: EventTarget | null): boolean {
  const element =
    target instanceof Element ? target : target instanceof Node ? target.parentElement : null;
  if (
    !element ||
    element.ownerDocument.querySelector('dialog[open], [role="dialog"][aria-modal="true"]')
  )
    return false;
  return !element.closest(
    'input, textarea, select, button, a, summary, label, [contenteditable]:not([contenteditable="false"]), [role="button"], [role="textbox"], [role="combobox"], [role="slider"], [role="checkbox"], [role="switch"]',
  );
}
