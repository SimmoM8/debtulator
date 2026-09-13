type SyncListener = () => void | Promise<void>;

const listeners = new Set<SyncListener>();

export function subscribeToSyncRequests(listener: SyncListener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function requestSync(): void {
  for (const listener of listeners) {
    void listener();
  }
}

export async function requestSyncAndWait(): Promise<void> {
  await Promise.all(Array.from(listeners, (listener) => listener()));
}
