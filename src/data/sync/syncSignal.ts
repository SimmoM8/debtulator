type SyncListener = () => void;

const listeners = new Set<SyncListener>();

export function subscribeToSyncRequests(listener: SyncListener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function requestSync(): void {
  for (const listener of listeners) {
    listener();
  }
}
