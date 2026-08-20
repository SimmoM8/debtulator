import { SnapshotCoordinator } from '../SnapshotCoordinator';

type Snapshot = Readonly<{ value: number }>;

class FakeUnitOfWork {
  constructor(private readonly state: { value: number }) {}

  async load(): Promise<Snapshot> {
    return { value: this.state.value };
  }

  async add(amount: number) {
    this.state.value += amount;
  }
}

class FakePort {
  readonly state = { value: 0 };
  readonly events: string[] = [];

  async load(): Promise<Snapshot> {
    this.events.push(`load:${this.state.value}`);
    return { value: this.state.value };
  }

  async transaction<TResult>(
    operation: (unitOfWork: FakeUnitOfWork) => Promise<TResult>,
  ): Promise<TResult> {
    this.events.push('transaction:start');
    const result = await operation(new FakeUnitOfWork(this.state));
    this.events.push('transaction:commit');
    return result;
  }
}

function deferred() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

describe('SnapshotCoordinator', () => {
  test('serializes the transaction and post-commit publication as one operation', async () => {
    const port = new FakePort();
    const coordinator = new SnapshotCoordinator<Snapshot, FakeUnitOfWork>(port);
    const gate = deferred();

    const first = coordinator.execute(async (unitOfWork, current) => {
      expect(current.value).toBe(0);
      await unitOfWork.add(1);
      await gate.promise;
      return 'first';
    });
    const second = coordinator.execute(async (unitOfWork, current) => {
      expect(current.value).toBe(1);
      await unitOfWork.add(10);
      return 'second';
    });

    await Promise.resolve();
    expect(port.events).toEqual(['transaction:start']);
    gate.release();

    await expect(Promise.all([first, second])).resolves.toEqual(['first', 'second']);
    expect(coordinator.getCurrent()).toEqual({
      revision: 2,
      snapshot: { value: 11 },
    });
    expect(port.events).toEqual([
      'transaction:start',
      'transaction:commit',
      'load:1',
      'transaction:start',
      'transaction:commit',
      'load:11',
    ]);
  });

  test('queues explicit refreshes behind mutations', async () => {
    const port = new FakePort();
    const coordinator = new SnapshotCoordinator<Snapshot, FakeUnitOfWork>(port);
    const gate = deferred();

    const mutation = coordinator.execute(async (unitOfWork) => {
      await unitOfWork.add(2);
      await gate.promise;
    });
    const refresh = coordinator.refresh();

    await Promise.resolve();
    expect(port.events).toEqual(['transaction:start']);
    gate.release();
    await mutation;
    await expect(refresh).resolves.toEqual({ revision: 2, snapshot: { value: 2 } });
  });

  test('does not start a later transaction while the prior post-commit read is pending', async () => {
    const port = new FakePort();
    const coordinator = new SnapshotCoordinator<Snapshot, FakeUnitOfWork>(port);
    const loadStarted = deferred();
    const releaseLoad = deferred();
    const originalLoad = port.load.bind(port);
    let loadCount = 0;
    port.load = async () => {
      loadCount += 1;
      if (loadCount === 1) {
        loadStarted.release();
        await releaseLoad.promise;
      }
      return originalLoad();
    };

    const first = coordinator.execute(async (unitOfWork) => {
      await unitOfWork.add(1);
    });
    await loadStarted.promise;
    const second = coordinator.execute(async (unitOfWork, current) => {
      expect(current.value).toBe(1);
      await unitOfWork.add(10);
    });

    expect(port.events).toEqual(['transaction:start', 'transaction:commit']);
    releaseLoad.release();
    await Promise.all([first, second]);

    expect(port.events).toEqual([
      'transaction:start',
      'transaction:commit',
      'load:1',
      'transaction:start',
      'transaction:commit',
      'load:11',
    ]);
    expect(coordinator.getCurrent()).toEqual({
      revision: 2,
      snapshot: { value: 11 },
    });
  });

  test('releases the queue after a failed command without publishing it', async () => {
    const port = new FakePort();
    const coordinator = new SnapshotCoordinator<Snapshot, FakeUnitOfWork>(port);

    await expect(
      coordinator.execute(async () => {
        throw new Error('write failed');
      }),
    ).rejects.toThrow('write failed');

    await coordinator.execute(async (unitOfWork) => {
      await unitOfWork.add(3);
    });
    expect(coordinator.getCurrent()).toEqual({ revision: 1, snapshot: { value: 3 } });
  });

  test('recovers after a post-commit read failure and never publishes stale state', async () => {
    const port = new FakePort();
    const coordinator = new SnapshotCoordinator<Snapshot, FakeUnitOfWork>(port);
    const originalLoad = port.load.bind(port);
    let failNextLoad = true;
    port.load = async () => {
      if (failNextLoad) {
        failNextLoad = false;
        throw new Error('read failed after commit');
      }
      return originalLoad();
    };

    await expect(
      coordinator.execute(async (unitOfWork) => unitOfWork.add(1)),
    ).rejects.toThrow('read failed after commit');
    expect(port.state.value).toBe(1);
    expect(coordinator.getCurrent()).toBeNull();

    await coordinator.execute(async (unitOfWork, current) => {
      expect(current.value).toBe(1);
      await unitOfWork.add(2);
    });
    expect(coordinator.getCurrent()).toEqual({
      revision: 1,
      snapshot: { value: 3 },
    });
  });

  test('publishes monotonically and immediately replays the latest value', async () => {
    const port = new FakePort();
    const coordinator = new SnapshotCoordinator<Snapshot, FakeUnitOfWork>(port);
    const observed: number[] = [];

    const unsubscribe = coordinator.subscribe(({ revision }) => observed.push(revision));
    await coordinator.refresh();
    await coordinator.execute(async (unitOfWork) => unitOfWork.add(1));

    const replayed: number[] = [];
    coordinator.subscribe(({ revision }) => replayed.push(revision));
    unsubscribe();
    await coordinator.refresh();

    expect(observed).toEqual([1, 2]);
    expect(replayed).toEqual([2, 3]);
  });
});
