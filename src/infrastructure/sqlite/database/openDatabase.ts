import * as SQLite from "expo-sqlite";

import { createSchema } from "./createSchema";
import type { DebtulatorDatabase } from "./types";

const DATABASE_NAME = "debtulator.db";

let databasePromise: Promise<DebtulatorDatabase> | null = null;

async function createDatabase(): Promise<DebtulatorDatabase> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);

  await db.execAsync(`
    PRAGMA foreign_keys = ON;
  `);

  await createSchema(db);

  return db;
}

export function openDatabase(): Promise<DebtulatorDatabase> {
  if (!databasePromise) {
    databasePromise = createDatabase();
  }

  return databasePromise;
}
