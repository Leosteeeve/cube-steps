import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cropAtTime, containsTarget, checkEventCrop } from './crop-geometry.mjs';

test('detects a target cropped out during a transition, although the previous keyframe contains it', () => {
  const crops = [
    { at: 0, rect: [0, 0, 100, 100] },
    { at: 4, rect: [80, 0, 100, 100] },
  ];
  const target = { x: 10, y: 10, width: 10, height: 10 };
  assert.equal(containsTarget(crops[0].rect, target), true);
  assert.equal(containsTarget(cropAtTime(crops, 2), target), false);
});

test('checks the entire pre-click highlight even when the click frame itself fits', () => {
  const crops = [
    { at: 0, rect: [80, 0, 100, 100] },
    { at: 1, rect: [0, 0, 100, 100] },
  ];
  const event = { frame: 30, target: { x: 10, y: 10, width: 10, height: 10 } };
  assert.equal(containsTarget(cropAtTime(crops, 1), event.target), true);
  assert.ok(checkEventCrop(crops, event).some((failure) => failure.frame === 12));
  assert.deepEqual(checkEventCrop([{ at: 0, rect: [0, 0, 100, 100] }], event), []);
});

test('uses cubic in/out easing and clamps to endpoint rectangles', () => {
  const crops = [
    { at: 0, rect: [0, 0, 100, 100] },
    { at: 4, rect: [80, 40, 200, 300] },
  ];
  assert.deepEqual(cropAtTime(crops, 1), [5, 2.5, 106.25, 112.5]);
  assert.deepEqual(cropAtTime(crops, -1), crops[0].rect);
  assert.deepEqual(cropAtTime(crops, 9), crops[1].rect);
  assert.deepEqual(cropAtTime([crops[0]], 9), crops[0].rect);
});
