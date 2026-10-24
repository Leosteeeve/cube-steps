import { beforeAll, expect, it } from 'vitest';
import { createCubeEngine } from '../core/cube';
import type { CubeEngine } from '../core/types';
import { ADVANCED_ROUX_COURSE, ADVANCED_ROUX_DETAILS } from './roux-advanced-course';
import { createRouxLessonDemonstration, verifyRouxWorkedExample } from './roux-advanced/examples';
import { CMLL_CATALOG } from '../methods/roux-advanced/cmll/catalog';
import { createPlaybackTimeline } from '../player/playback-timeline';
import { buildPlaybackInitialSetup } from '../player/initial-setup';
let e: CubeEngine;
beforeAll(async () => {
  e = await createCubeEngine();
});
it('teaches nine real chapters with verified examples, physical checks and recovery', () => {
  expect(ADVANCED_ROUX_COURSE.map((c) => c.id)).toEqual([
    'intro',
    'ar-first-block',
    'block-strategies',
    'block-lookahead',
    'ar-second-block',
    'ar-cmll',
    'ar-eolr',
    'starting-block',
    'practice-compare',
  ]);
  const frames = new Set<string>(),
    cases = new Set<string>(),
    turns = new Set<string>();
  for (const chapter of ADVANCED_ROUX_COURSE) {
    const detail = ADVANCED_ROUX_DETAILS[chapter.id];
    expect(detail.workedExamples.length).toBeGreaterThan(0);
    expect(detail.mistakes.length).toBeGreaterThan(0);
    expect(detail.physicalChecks.length).toBeGreaterThan(0);
    for (const text of [
      chapter.observe,
      chapter.prepare,
      chapter.check,
      chapter.tip,
      detail.overview,
    ])
      expect(text.length).toBeGreaterThan(40);
    for (const ref of detail.referenceIds) expect(CMLL_CATALOG.variants[ref]).toBeDefined();
    for (const example of detail.workedExamples) {
      expect(verifyRouxWorkedExample(e, example)).toBe(true);
      frames.add(example.frameId);
      cases.add(example.expectedCaseId);
      example.moves.forEach((m) => turns.add(m));
      const source = createRouxLessonDemonstration(e, example),
        timeline = createPlaybackTimeline(e, source);
      expect(
        e.equals(e.apply(e.solved(), buildPlaybackInitialSetup(e, source)), timeline.states[0]),
      ).toBe(true);
      expect(e.equals(e.apply(timeline.states[0], timeline.moves), timeline.states.at(-1)!)).toBe(
        true,
      );
    }
  }
  expect(frames.size).toBe(8);
  expect(turns.has('M')).toBe(true);
  expect(turns.has("M'")).toBe(true);
  for (const id of [
    'square-pair',
    'two-pairs-late-base',
    'line',
    'joined-pair',
    'eolr-combined',
    'lse-basic',
  ])
    expect(cases.has(id)).toBe(true);
});
it('rejects changed or mislabeled worked examples before playback', () => {
  const sample = ADVANCED_ROUX_DETAILS['block-strategies'].workedExamples[0];
  expect(verifyRouxWorkedExample(e, { ...sample, moves: [] })).toBe(false);
  expect(() =>
    createRouxLessonDemonstration(e, { ...sample, expectedCaseId: 'invented' }),
  ).toThrow();
});
