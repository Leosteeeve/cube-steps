// Shared by the editable film renderer and its crop checker. Matches Remotion's
// clamped interpolate(..., { easing: Easing.inOut(Easing.cubic) }).
export function cropAtTime(crops, time) {
  if (time <= crops[0].at || crops.length === 1) return crops[0].rect;
  const next = crops.findIndex((crop) => crop.at >= time);
  if (next === -1) return crops.at(-1).rect;
  const left = crops[next - 1],
    right = crops[next];
  const t = (time - left.at) / (right.at - left.at);
  const ease = t < 0.5 ? (2 * t) ** 3 / 2 : 1 - (2 * (1 - t)) ** 3 / 2;
  return left.rect.map((value, index) => value + (right.rect[index] - value) * ease);
}

export function checkEventCrop(crops, event, fps = 30, leadFrames = 18) {
  const failures = [];
  // The highlight is visible before the recorded click, including while the
  // camera is moving. Checking only the click frame misses that interval.
  for (let frame = Math.max(0, event.frame - leadFrames); frame <= event.frame; frame++) {
    const crop = cropAtTime(crops, frame / fps);
    if (!containsTarget(crop, event.target)) failures.push({ frame, crop });
  }
  return failures;
}

export function containsTarget(crop, target) {
  const [x, y, width, height] = crop;
  return (
    target.x >= x &&
    target.y >= y &&
    target.x + target.width <= x + width &&
    target.y + target.height <= y + height
  );
}
