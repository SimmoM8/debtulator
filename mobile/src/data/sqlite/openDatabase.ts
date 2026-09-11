import type { SQLiteDatabase } from "expo-sqlite";
import * as SQLite from "expo-sqlite";

import { migrateDatabase } from "./migrateDatabase";

const DATABASE_NAME = "debtulator.db";

let databasePromise: Promise<SQLiteDatabase> | null = null;

async function createDatabase(): Promise<SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);

  await migrateDatabase(db);

  return db;
}

export function openDatabase(): Promise<SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = createDatabase();
  }

  return databasePromise;
}
