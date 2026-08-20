import {
  SnapshotCoordinator,
  type SnapshotPublication,
} from '@debtulator/application/state/SnapshotCoordinator';
import type { AppSnapshot } from '@debtulator/application/model/AppSnapshot';
import type {
  LocalLedgerPort,
  LocalLedgerUnitOfWork,
} from '@debtulator/application/local-data/LocalLedgerPort';
import {
  createLocalLedgerCommands,
  type LocalLedgerCommands,
} from '@debtulator/application/local-data/createLocalLedgerCommands';
import { openDebtulatorDatabase } from '@/src/infrastructure/sqlite/database';
import { DebtulatorRepository } from '@/src/infrastructure/sqlite/DebtulatorRepository';

/** Mobile composition adapter; SQLite never leaks into application or UI. */
export class SqliteLocalLedgerAdapter implements LocalLedgerPort {
  constructor(private readonly repository: DebtulatorRepository) {}

  load(): Promise<AppSnapshot> {
    return this.repository.load();
  }

  transaction<TResult>(
    operation: (unitOfWork: LocalLedgerUnitOfWork) => Promise<TResult>,
  ): Promise<TResult> {
    return this.repository.transaction((repository) => operation(repository));
  }
}

export type MobileLocalDataRuntime = Readonly<{
  coordinator: SnapshotCoordinator<AppSnapshot, LocalLedgerUnitOfWork>;
  commands: LocalLedgerCommands;
  initial: SnapshotPublication<AppSnapshot>;
}>;

export async function openMobileLocalData(): Promise<MobileLocalDataRuntime> {
  const database = await openDebtulatorDatabase();
  const adapter = new SqliteLocalLedgerAdapter(
    new DebtulatorRepository(database),
  );
  const coordinator = new SnapshotCoordinator(adapter);

  let initial = await coordinator.refresh();
  if (initial.snapshot.settings.recurringGenerationPreference === 'auto') {
    await coordinator.execute((unitOfWork) =>
      unitOfWork.generateDueRecurringRecords(),
    );
    initial = coordinator.getCurrent() ?? initial;
  }

  return {
    coordinator,
    commands: createLocalLedgerCommands(coordinator),
    initial,
  };
}
