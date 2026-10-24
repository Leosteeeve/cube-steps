import type { TourId } from '../tutorial/types';
export const GUIDE_SECTION_IDS = [
  'start',
  'moves',
  'lessons',
  'roux',
  'advanced-roux',
  'solve',
  'algorithms',
  'practice',
  'timer',
  'lab',
  'roux-lab',
  'help',
] as const;
export type GuideSectionId = (typeof GUIDE_SECTION_IDS)[number];
export type GuideChapter = {
  id: GuideSectionId;
  title: string;
  summary: string;
  steps: readonly string[];
  controls: readonly { name: string; description: string }[];
  href?: string;
  tourIds: readonly TourId[];
  screenshotIds: readonly string[];
};
export type GuideScreenshot = {
  id: string;
  src: string;
  alt: string;
  caption: string;
  route: string;
  width: number;
  height: number;
  sourceRevision: string;
  scenario: string;
  exampleData: boolean;
};
