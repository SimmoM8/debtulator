import React, { createContext, useContext } from 'react';

import type { CollaborationGateway } from '@/src/application/ports/collaborationGateway';

const CollaborationContext = createContext<CollaborationGateway | null>(null);

export function CollaborationProvider({
  children,
  gateway,
}: {
  children: React.ReactNode;
  gateway: CollaborationGateway;
}) {
  return (
    <CollaborationContext.Provider value={gateway}>
      {children}
    </CollaborationContext.Provider>
  );
}

export function useCollaboration() {
  const gateway = useContext(CollaborationContext);
  if (!gateway) {
    throw new Error('CollaborationProvider is missing from the app root.');
  }
  return gateway;
}
