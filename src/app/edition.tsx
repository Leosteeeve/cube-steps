import { createContext, useContext, type ReactNode } from 'react';
export type Edition = 'global' | 'club';
const EditionContext = createContext<Edition>('global');
export function EditionProvider({ edition, children }: { edition: Edition; children: ReactNode }) {
  return <EditionContext.Provider value={edition}>{children}</EditionContext.Provider>;
}
export const useEdition = () => useContext(EditionContext);
