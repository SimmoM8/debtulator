import { describe, expect, it, jest } from '@jest/globals';
import type * as SQLite from 'expo-sqlite';

import { DebtulatorRepository } from '@/src/infrastructure/sqlite/DebtulatorRepository';

function createDatabaseDouble() {
  const withTransactionAsync = jest.fn(
    async (operation: () => Promise<void>) => operation(),
  );
  return {
    database: { withTransactionAsync } as unknown as SQLite.SQLiteDatabase,
    withTransactionAsync,
  };
}

describe('DebtulatorRepository transactions', () => {
  it('serializes overlapping application commands', async () => {
    const { database, withTransactionAsync } = createDatabaseDouble();
    const repository = new DebtulatorRepository(database);
    const events: string[] = [];
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const first = repository.transaction(async () => {
      events.push('first:start');
      await firstGate;
      events.push('first:end');
      return 'first';
    });
    const second = repository.transaction(async () => {
      events.push('second:start');
      return 'second';
    });

    await Promise.resolve();
    expect(events).toEqual(['first:start']);

    releaseFirst();
    await expect(Promise.all([first, second])).resolves.toEqual([
      'first',
      'second',
    ]);
    expect(events).toEqual(['first:start', 'first:end', 'second:start']);
    expect(withTransactionAsync).toHaveBeenCalledTimes(2);
  });

  it('releases the command queue after a rolled-back operation', async () => {
    const { database, withTransactionAsync } = createDatabaseDouble();
    const repository = new DebtulatorRepository(database);

    await expect(
      repository.transaction(async () => {
        throw new Error('write failed');
      }),
    ).rejects.toThrow('write failed');

    await expect(repository.transaction(async () => 42)).resolves.toBe(42);
    expect(withTransactionAsync).toHaveBeenCalledTimes(2);
  });
});
