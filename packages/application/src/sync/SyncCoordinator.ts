export type SyncReason =
  | 'auth-bootstrap'
  | 'foreground'
  | 'manual'
  | 'outbox'
  | 'realtime'
  | 'reset';

export type SyncRun = Readonly<{
  userId: string;
  reasons: ReadonlySet<SyncReason>;
  signal: AbortSignal;
}>;

export type SyncRunner = (run: SyncRun) => Promise<void>;

/** Coalesces all sync triggers into one cancellable run per authenticated user. */
export class SyncCoordinator {
  private userId: string | null = null;
  private epoch = 0;
  private controller: AbortController | null = null;
  private pendingReasons = new Set<SyncReason>();
  private running: Promise<void> | null = null;

  constructor(private readonly runner: SyncRunner) {}

  setUser(userId: string | null): void {
    if (this.userId === userId) {
      return;
    }

    this.userId = userId;
    this.epoch += 1;
    this.pendingReasons.clear();
    this.controller?.abort();
    this.controller = null;
  }

  request(reason: SyncReason): Promise<void> {
    if (!this.userId) {
      return Promise.resolve();
    }

    this.pendingReasons.add(reason);
    if (!this.running) {
      // Start on the next microtask so synchronous trigger bursts coalesce.
      const run = Promise.resolve().then(() => this.drain());
      this.running = run;
      void run.then(
        () => this.finish(run),
        () => this.finish(run),
      );
    }
    return this.running;
  }

  async whenIdle(): Promise<void> {
    await this.running;
  }

  dispose(): void {
    this.setUser(null);
  }

  private async drain(): Promise<void> {
    while (this.userId && this.pendingReasons.size > 0) {
      const userId = this.userId;
      const epoch = this.epoch;
      const reasons = new Set(this.pendingReasons);
      this.pendingReasons.clear();
      const controller = new AbortController();
      this.controller = controller;

      try {
        await this.runner({ userId, reasons, signal: controller.signal });
      } catch (error) {
        // A session switch invalidates the old run. Continue with any reasons
        // queued for the new user even when the old runner reports cancellation.
        if (!controller.signal.aborted || this.epoch === epoch) {
          throw error;
        }
      } finally {
        if (this.controller === controller) {
          this.controller = null;
        }
      }
    }
  }

  private finish(run: Promise<void>): void {
    if (this.running === run) {
      this.running = null;
    }
  }
}
