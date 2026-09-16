'use client';

import { createContext, useContext } from 'react';

const WorkspaceSlugContext = createContext<string>('');

export function WorkspaceSlugProvider({
  slug,
  children,
}: {
  slug: string;
  children: React.ReactNode;
}) {
  return (
    <WorkspaceSlugContext.Provider value={slug}>
      {children}
    </WorkspaceSlugContext.Provider>
  );
}

export function useWorkspaceSlug(): string {
  return useContext(WorkspaceSlugContext);
}
