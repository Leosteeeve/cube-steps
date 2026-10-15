export type TourId =
  | 'home'
  | 'quiz'
  | 'moves'
  | 'lesson-intro'
  | 'lesson-player'
  | 'solve'
  | 'algorithms'
  | 'algorithm'
  | 'practice'
  | 'timer'
  | 'lab';
import type { GuidanceAction } from '../../ui/guidance';
export type { GuidanceAction } from '../../ui/guidance';
export type TourStep = {
  id: string;
  targetId: string;
  title: string;
  body: string;
  guideSection: string;
  action?: GuidanceAction;
};
export type TourDefinition = { id: TourId; contentVersion: number; steps: readonly TourStep[] };
export type TutorialPreferences = {
  version: 1;
  welcome: 'new' | 'later' | 'started' | 'never';
  dismissed: Partial<Record<TourId, number>>;
  tours: Partial<
    Record<TourId, { contentVersion: number; nextStepId?: string; completed: boolean }>
  >;
};
export type TourRun = {
  tourId: TourId;
  stepId: string;
  token: number;
  status: 'waiting' | 'ready' | 'done' | 'unavailable';
};
export type TourSnapshot = { run: TourRun | null; preferences: TutorialPreferences };
