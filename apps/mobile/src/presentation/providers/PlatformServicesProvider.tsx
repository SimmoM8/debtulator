import React, { createContext, useContext } from 'react';

import type { PlatformFileServices } from '@debtulator/application/ports/fileGateway';

const PlatformServicesContext = createContext<PlatformFileServices | null>(null);

export function PlatformServicesProvider({
  children,
  services,
}: {
  children: React.ReactNode;
  services: PlatformFileServices;
}) {
  return (
    <PlatformServicesContext.Provider value={services}>
      {children}
    </PlatformServicesContext.Provider>
  );
}

export function usePlatformServices() {
  const services = useContext(PlatformServicesContext);
  if (!services) {
    throw new Error('PlatformServicesProvider is missing from the app root.');
  }
  return services;
}
