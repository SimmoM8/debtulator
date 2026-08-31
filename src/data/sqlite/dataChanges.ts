export type DataResource = "members" | "debts";

type Listener = (resources: ReadonlySet<DataResource>) => void;

const listeners = new Set<Listener>();

export function emitDataChanged(...resources: DataResource[]): void {
  const changed = new Set(resources);

  for (const listener of listeners) {
    listener(changed);
  }
}

export function subscribeToDataChanges(listener: Listener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
