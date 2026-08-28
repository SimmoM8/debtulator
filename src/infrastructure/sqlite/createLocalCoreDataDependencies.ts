import type { CoreDataDependencies } from "@/src/application/core/CoreDataDependencies";

import { openDatabase } from "./database/openDatabase";
import { SqliteDebtRepository } from "./repositories/SqliteDebtRepository";
import { SqliteMemberRepository } from "./repositories/SqliteMemberRepository";

export async function createLocalCoreDataDependencies(): Promise<CoreDataDependencies> {
  const db = await openDatabase();

  return {
    debts: new SqliteDebtRepository(db),
    members: new SqliteMemberRepository(db),
  };
}
