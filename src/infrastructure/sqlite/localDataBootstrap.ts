import type {
    AppDataRepository,
    LocalDataBootstrap,
} from "@/src/application/ports/localDataBootstrap";
import {
    loadSnapshot,
    openDebtulatorDatabase,
} from "@/src/infrastructure/sqlite/database";
import { DebtulatorRepository } from "@/src/infrastructure/sqlite/DebtulatorRepository";

export const sqliteLocalDataBootstrap: LocalDataBootstrap = {
  async boot() {
    const db = await openDebtulatorDatabase();
    const repository = new DebtulatorRepository(db);
    const initial = await loadSnapshot(db);
    if (initial.settings.recurringGenerationPreference === "auto") {
      await repository.generateDueRecurringRecords();
    }
    return {
      repository: repository as unknown as AppDataRepository,
      snapshot: await loadSnapshot(db),
    };
  },
};
