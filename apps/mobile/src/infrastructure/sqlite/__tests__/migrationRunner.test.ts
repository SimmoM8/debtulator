import {
  runDatabaseMigrations,
  type DatabaseMigration,
  type MigrationDatabase,
} from '../migrationRunner';

class FakeMigrationDatabase implements MigrationDatabase {
  userVersion = 0;
  values: string[] = [];
  events: string[] = [];

  async getFirstAsync<TResult>(): Promise<TResult | null> {
    return { user_version: this.userVersion } as TResult;
  }

  async execAsync(query: string): Promise<void> {
    const match = query.match(/PRAGMA user_version = (\d+)/);
    if (match) {
      this.userVersion = Number(match[1]);
      this.events.push(`version:${this.userVersion}`);
    }
  }

  async withTransactionAsync(operation: () => Promise<void>): Promise<void> {
    const savedVersion = this.userVersion;
    const savedValues = [...this.values];
    this.events.push('begin');
    try {
      await operation();
      this.events.push('commit');
    } catch (error) {
      this.userVersion = savedVersion;
      this.values = savedValues;
      this.events.push('rollback');
      throw error;
    }
  }
}

function migration(
  version: number,
  name: string,
  up: DatabaseMigration['up'],
): DatabaseMigration {
  return { version, name, up };
}

describe('runDatabaseMigrations', () => {
  test('applies missing migrations in order and records each successful version', async () => {
    const database = new FakeMigrationDatabase();
    const migrations = [
      migration(1, 'baseline', async (db) => {
        (db as FakeMigrationDatabase).values.push('baseline');
      }),
      migration(2, 'indexes', async (db) => {
        (db as FakeMigrationDatabase).values.push('indexes');
      }),
    ];

    await expect(runDatabaseMigrations(database, migrations)).resolves.toBe(2);
    expect(database.values).toEqual(['baseline', 'indexes']);
    expect(database.events).toEqual([
      'begin',
      'version:1',
      'commit',
      'begin',
      'version:2',
      'commit',
    ]);
  });

  test('does not replay an already installed version', async () => {
    const database = new FakeMigrationDatabase();
    database.userVersion = 1;

    await runDatabaseMigrations(database, [
      migration(1, 'baseline', async () => {
        throw new Error('must not run');
      }),
    ]);

    expect(database.events).toEqual([]);
  });

  test('rolls back the version and changes after failure, then retries cleanly', async () => {
    const database = new FakeMigrationDatabase();
    let fail = true;
    const migrations = [
      migration(1, 'baseline', async (db) => {
        (db as FakeMigrationDatabase).values.push('created');
        if (fail) {
          throw new Error('injected migration failure');
        }
      }),
    ];

    await expect(runDatabaseMigrations(database, migrations)).rejects.toThrow(
      'injected migration failure',
    );
    expect(database.userVersion).toBe(0);
    expect(database.values).toEqual([]);

    fail = false;
    await expect(runDatabaseMigrations(database, migrations)).resolves.toBe(1);
    expect(database.values).toEqual(['created']);
  });

  test('rejects downgrade and malformed registries before changing the database', async () => {
    const database = new FakeMigrationDatabase();
    database.userVersion = 3;
    await expect(
      runDatabaseMigrations(database, [migration(1, 'baseline', async () => undefined)]),
    ).rejects.toThrow('newer than this app supports');

    await expect(
      runDatabaseMigrations(database, [
        migration(1, 'duplicate', async () => undefined),
        migration(1, 'duplicate', async () => undefined),
      ]),
    ).rejects.toThrow('strictly increasing');
    expect(database.events).toEqual([]);
  });
});
