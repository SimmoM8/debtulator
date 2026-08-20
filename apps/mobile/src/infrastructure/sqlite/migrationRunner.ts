export interface MigrationDatabase {
  getFirstAsync<TResult>(query: string): Promise<TResult | null>;
  execAsync(query: string): Promise<void>;
  withTransactionAsync(operation: () => Promise<void>): Promise<void>;
}

export type DatabaseMigration = Readonly<{
  version: number;
  name: string;
  up(database: MigrationDatabase): Promise<void>;
}>;

export async function runDatabaseMigrations(
  database: MigrationDatabase,
  migrations: readonly DatabaseMigration[],
): Promise<number> {
  assertValidMigrationRegistry(migrations);
  const row = await database.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version',
  );
  let currentVersion = Number(row?.user_version ?? 0);
  const latestVersion = migrations.at(-1)?.version ?? 0;

  if (currentVersion > latestVersion) {
    throw new Error(
      `Local database version ${currentVersion} is newer than this app supports (${latestVersion}).`,
    );
  }

  for (const migration of migrations) {
    if (migration.version <= currentVersion) {
      continue;
    }

    await database.withTransactionAsync(async () => {
      await migration.up(database);
      await database.execAsync(`PRAGMA user_version = ${migration.version}`);
    });
    currentVersion = migration.version;
  }

  return currentVersion;
}

function assertValidMigrationRegistry(migrations: readonly DatabaseMigration[]) {
  let previousVersion = 0;
  const names = new Set<string>();
  for (const migration of migrations) {
    if (!Number.isInteger(migration.version) || migration.version <= previousVersion) {
      throw new Error('Database migrations must have strictly increasing integer versions.');
    }
    if (!migration.name.trim() || names.has(migration.name)) {
      throw new Error('Database migration names must be non-empty and unique.');
    }
    previousVersion = migration.version;
    names.add(migration.name);
  }
}
