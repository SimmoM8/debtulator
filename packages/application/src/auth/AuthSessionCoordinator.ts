export interface AuthSessionPort<TSession> {
  getSession(): Promise<TSession | null>;
  subscribe(listener: (session: TSession | null) => void): () => void;
}

export type AuthSessionListener<TSession> = (session: TSession | null) => void;

/**
 * Subscribes before reading the initial session. A late initial read cannot
 * overwrite a newer auth event, and callbacks never await nested auth work.
 */
export class AuthSessionCoordinator<TSession> {
  private generation = 0;
  private unsubscribe: (() => void) | null = null;

  constructor(private readonly port: AuthSessionPort<TSession>) {}

  start(listener: AuthSessionListener<TSession>): () => void {
    this.stop();
    const generation = ++this.generation;
    let eventRevision = 0;

    this.unsubscribe = this.port.subscribe((session) => {
      if (this.generation !== generation) {
        return;
      }
      eventRevision += 1;
      listener(session);
    });

    const initialRevision = eventRevision;
    void this.port.getSession().then(
      (session) => {
        if (
          this.generation === generation &&
          eventRevision === initialRevision
        ) {
          listener(session);
        }
      },
      () => undefined,
    );

    return () => {
      if (this.generation === generation) {
        this.stop();
      }
    };
  }

  stop(): void {
    this.generation += 1;
    this.unsubscribe?.();
    this.unsubscribe = null;
  }
}
