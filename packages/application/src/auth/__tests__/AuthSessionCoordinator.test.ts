import {
  AuthSessionCoordinator,
  type AuthSessionPort,
} from '../AuthSessionCoordinator';

type Session = Readonly<{ userId: string }>;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

class FakeAuthPort implements AuthSessionPort<Session> {
  readonly initial = deferred<Session | null>();
  listener: ((session: Session | null) => void) | null = null;
  subscriptions = 0;
  cleanups = 0;

  getSession() {
    return this.initial.promise;
  }

  subscribe(listener: (session: Session | null) => void) {
    this.subscriptions += 1;
    this.listener = listener;
    return () => {
      this.cleanups += 1;
      if (this.listener === listener) {
        this.listener = null;
      }
    };
  }
}

describe('AuthSessionCoordinator', () => {
  test('does not let a late initial session overwrite a newer auth event', async () => {
    const port = new FakeAuthPort();
    const coordinator = new AuthSessionCoordinator(port);
    const sessions: (string | null)[] = [];
    coordinator.start((session) => sessions.push(session?.userId ?? null));

    port.listener?.({ userId: 'new-user' });
    port.initial.resolve({ userId: 'old-user' });
    await Promise.resolve();

    expect(sessions).toEqual(['new-user']);
  });

  test('remounts with one listener and ignores results after cleanup', async () => {
    const firstPort = new FakeAuthPort();
    const first = new AuthSessionCoordinator(firstPort);
    const sessions: string[] = [];
    const cleanup = first.start((session) => {
      if (session) sessions.push(session.userId);
    });
    cleanup();
    firstPort.initial.resolve({ userId: 'late' });
    await Promise.resolve();

    expect(sessions).toEqual([]);
    expect(firstPort.subscriptions).toBe(1);
    expect(firstPort.cleanups).toBe(1);
  });
});
