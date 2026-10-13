import { createPracticeStore, practiceStore } from '../../practice/storage';
import { useEdition } from '../edition';
// One session store per edition preserves unsaved selections across library navigation.
const clubPracticeStore = createPracticeStore(
  () => localStorage,
  'cubesteps.club.practice-selection.v1',
);
export function usePracticeStore() {
  return useEdition() === 'club' ? clubPracticeStore : practiceStore;
}
