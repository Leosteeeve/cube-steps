const selector = 'button,a[href],input,select,textarea,[tabindex]';
export function collectTourFocusables(
  bubble: HTMLElement,
  target: HTMLElement | null,
  interactive: boolean,
): HTMLElement[] {
  const nodes = [...bubble.querySelectorAll<HTMLElement>(selector)];
  if (interactive && target) {
    if (target.matches(selector)) nodes.push(target);
    nodes.push(...target.querySelectorAll<HTMLElement>(selector));
  }
  return [...new Set(nodes)].filter(
    (node) =>
      !node.matches(':disabled') &&
      node.tabIndex >= 0 &&
      !node.closest('[hidden],[inert]') &&
      getComputedStyle(node).display !== 'none' &&
      getComputedStyle(node).visibility !== 'hidden',
  );
}
