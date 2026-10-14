export function positionTour(
  target: DOMRectReadOnly,
  bubble: { width: number; height: number },
  viewport: { left: number; top: number; width: number; height: number },
) {
  const gap = 12,
    minX = viewport.left + gap,
    minY = viewport.top + gap,
    maxX = Math.max(minX, viewport.left + viewport.width - bubble.width - gap),
    maxY = Math.max(minY, viewport.top + viewport.height - bubble.height - gap);
  const x = Math.min(maxX, Math.max(minX, target.left + (target.width - bubble.width) / 2));
  const y = Math.min(maxY, Math.max(minY, target.top + (target.height - bubble.height) / 2));
  if (target.bottom + gap <= maxY)
    return { left: x, top: Math.max(minY, target.bottom + gap), placement: 'bottom' as const };
  if (target.top - gap - bubble.height >= minY)
    return {
      left: x,
      top: Math.min(maxY, target.top - gap - bubble.height),
      placement: 'top' as const,
    };
  if (target.right + gap <= maxX)
    return { left: target.right + gap, top: y, placement: 'right' as const };
  if (target.left - gap - bubble.width >= minX)
    return { left: target.left - gap - bubble.width, top: y, placement: 'left' as const };
  return { left: minX, top: maxY, placement: 'dock' as const };
}
