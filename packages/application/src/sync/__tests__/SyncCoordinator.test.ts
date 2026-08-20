import { SyncCoordinator, type SyncRun } from '../SyncCoordinator';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('SyncCoordinator', () => {
  test('coalesces a trigger burst into one run', async () => {
    const runs: SyncRun[] = [];
    const coordinator = new SyncCoordinator(async (run) => {
      runs.push(run);
    });
    coordinator.setUser('user-a');

    const first = coordinator.request('manual');
    const second = coordinator.request('realtime');
    await Promise.all([first, second]);

    expect(runs).toHaveLength(1);
    expect([...runs[0].reasons]).toEqual(['manual', 'realtime']);
  });

  test('runs one coalesced follow-up for triggers received during a run', async () => {
    const gate = deferred();
    const reasons: string[][] = [];
    const coordinator = new SyncCoordinator(async (run) => {
      reasons.push([...run.reasons]);
      if (reasons.length === 1) {
        await gate.promise;
      }
    });
    coordinator.setUser('user-a');

    const running = coordinator.request('auth-bootstrap');
    await Promise.resolve();
    void coordinator.request('realtime');
    void coordinator.request('foreground');
    gate.resolve();
    await running;

    expect(reasons).toEqual([
      ['auth-bootstrap'],
      ['realtime', 'foreground'],
    ]);
  });

  test('aborts old-user work and discards its queued follow-up', async () => {
    const gate = deferred();
    const runs: SyncRun[] = [];
    const coordinator = new SyncCoordinator(async (run) => {
      runs.push(run);
      if (run.userId === 'user-a') {
        await gate.promise;
      }
    });
    coordinator.setUser('user-a');

    const oldRun = coordinator.request('manual');
    await Promise.resolve();
    void coordinator.request('realtime');
    coordinator.setUser('user-b');
    expect(runs[0].signal.aborted).toBe(true);
    gate.resolve();
    await oldRun;

    await coordinator.request('auth-bootstrap');
    expect(runs.map((run) => [run.userId, [...run.reasons]])).toEqual([
      ['user-a', ['manual']],
      ['user-b', ['auth-bootstrap']],
    ]);
  });

  test('does not wedge after a failed run', async () => {
    let attempts = 0;
    const coordinator = new SyncCoordinator(async () => {
      attempts += 1;
      if (attempts === 1) {
        throw new Error('offline');
      }
    });
    coordinator.setUser('user-a');

    await expect(coordinator.request('manual')).rejects.toThrow('offline');
    await expect(coordinator.request('manual')).resolves.toBeUndefined();
    expect(attempts).toBe(2);
  });
});
