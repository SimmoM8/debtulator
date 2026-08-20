export interface SnapshotUnitOfWork<TSnapshot> {
  load(): Promise<TSnapshot>;
}

export interface TransactionalSnapshotPort<
  TSnapshot,
  TUnitOfWork extends SnapshotUnitOfWork<TSnapshot>,
> {
  load(): Promise<TSnapshot>;
  transaction<TResult>(
    operation: (unitOfWork: TUnitOfWork) => Promise<TResult>,
  ): Promise<TResult>;
}

export type SnapshotPublication<TSnapshot> = Readonly<{
  revision: number;
  snapshot: TSnapshot;
}>;

export type SnapshotListener<TSnapshot> = (
  publication: SnapshotPublication<TSnapshot>,
) => void;

/**
 * Owns every operation which can publish local application state.
 *
 * The queue intentionally spans the fresh read inside the transaction, the
 * mutation itself, and the post-commit reload. Releasing the queue before the
 * reload would allow a later command to publish first and then be overwritten
 * by an older snapshot.
 */
export class SnapshotCoordinator<
  TSnapshot,
  TUnitOfWork extends SnapshotUnitOfWork<TSnapshot>,
> {
  private queue: Promise<void> = Promise.resolve();
  private revision = 0;
  private publication: SnapshotPublication<TSnapshot> | null = null;
  private readonly listeners = new Set<SnapshotListener<TSnapshot>>();

  constructor(
    private readonly port: TransactionalSnapshotPort<TSnapshot, TUnitOfWork>,
  ) {}

  getCurrent(): SnapshotPublication<TSnapshot> | null {
    return this.publication;
  }

  subscribe(listener: SnapshotListener<TSnapshot>): () => void {
    this.listeners.add(listener);
    if (this.publication) {
      listener(this.publication);
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  refresh(): Promise<SnapshotPublication<TSnapshot>> {
    return this.enqueue(async () => this.publish(await this.port.load()));
  }

  execute<TResult>(
    operation: (
      unitOfWork: TUnitOfWork,
      current: TSnapshot,
    ) => Promise<TResult>,
  ): Promise<TResult> {
    return this.enqueue(async () => {
      const result = await this.port.transaction(async (unitOfWork) => {
        const current = await unitOfWork.load();
        return operation(unitOfWork, current);
      });

      this.publish(await this.port.load());
      return result;
    });
  }

  whenIdle(): Promise<void> {
    return this.queue;
  }

  private enqueue<TResult>(operation: () => Promise<TResult>): Promise<TResult> {
    const result = this.queue.then(operation, operation);
    this.queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  private publish(snapshot: TSnapshot): SnapshotPublication<TSnapshot> {
    const publication = Object.freeze({
      revision: ++this.revision,
      snapshot,
    });
    this.publication = publication;
    for (const listener of this.listeners) {
      listener(publication);
    }
    return publication;
  }
}
