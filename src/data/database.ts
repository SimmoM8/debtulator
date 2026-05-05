import * as SQLite from 'expo-sqlite';

import { DEFAULT_BASE_CURRENCY, DEFAULT_CURRENCY_RATES_TO_SEK } from '@/src/constants/currencies';
import type {
  AppSettings,
  CurrencyCode,
  CurrencyRate,
  Debt,
  Event,
  EventMember,
  EventStatus,
  Member,
  SharedExpense,
  Tag,
  VerificationStatus,
} from '@/src/types/models';
import { createId, nowIso, todayIsoDate } from '@/src/utils/id';
import { parseJsonArray, toJson } from '@/src/utils/json';
import { withGeneratedObligations } from '@/src/services/splits';

export type DatabaseSnapshot = {
  members: Member[];
  debts: Debt[];
  events: Event[];
  eventMembers: EventMember[];
  sharedExpenses: SharedExpense[];
  tags: Tag[];
  currencyRates: CurrencyRate[];
  settings: AppSettings;
};

type MemberRow = {
  id: string;
  display_name: string;
  notes: string | null;
  email: string | null;
  phone: string | null;
  tags_json: string | null;
  archived: number;
  created_at: string;
  updated_at: string;
};

type DebtRow = {
  id: string;
  member_id: string;
  direction: Debt['direction'];
  amount: number;
  currency: CurrencyCode;
  title: string;
  notes: string | null;
  debt_date: string;
  due_date: string | null;
  tags_json: string | null;
  event_id: string | null;
  status: Debt['status'];
  verification_status: VerificationStatus;
  created_at: string;
  updated_at: string;
};

type EventRow = {
  id: string;
  name: string;
  notes: string | null;
  default_currency: CurrencyCode;
  tags_json: string | null;
  status: EventStatus;
  archived: number;
  ignored_duplicate_keys_json: string | null;
  created_at: string;
  updated_at: string;
};

type EventMemberRow = {
  event_id: string;
  member_id: string;
  created_at: string;
};

type SharedExpenseRow = {
  id: string;
  event_id: string;
  payer_id: string;
  amount: number;
  currency: CurrencyCode;
  title: string;
  notes: string | null;
  expense_date: string;
  participant_ids_json: string | null;
  split_method: SharedExpense['splitMethod'];
  generated_obligations_json: string | null;
  tags_json: string | null;
  status: Debt['status'];
  verification_status: VerificationStatus;
  created_at: string;
  updated_at: string;
};

type TagRow = {
  id: string;
  name: string;
  color: string;
  created_at: string;
};

type RateRow = {
  currency: CurrencyCode;
  rate_to_sek: number;
  updated_at: string;
};

type SettingRow = {
  key: string;
  value: string;
};

const DB_NAME = 'debtulator-stage1.db';

export async function openDebtulatorDatabase() {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await migrate(db);
  await seedIfEmpty(db);
  return db;
}

export async function migrate(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY NOT NULL,
      display_name TEXT NOT NULL,
      notes TEXT,
      email TEXT,
      phone TEXT,
      tags_json TEXT NOT NULL DEFAULT '[]',
      archived INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      notes TEXT,
      default_currency TEXT NOT NULL,
      tags_json TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL,
      archived INTEGER NOT NULL DEFAULT 0,
      ignored_duplicate_keys_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS event_members (
      event_id TEXT NOT NULL,
      member_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (event_id, member_id)
    );

    CREATE TABLE IF NOT EXISTS debts (
      id TEXT PRIMARY KEY NOT NULL,
      member_id TEXT NOT NULL,
      direction TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL,
      title TEXT NOT NULL,
      notes TEXT,
      debt_date TEXT NOT NULL,
      due_date TEXT,
      tags_json TEXT NOT NULL DEFAULT '[]',
      event_id TEXT,
      status TEXT NOT NULL,
      verification_status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS shared_expenses (
      id TEXT PRIMARY KEY NOT NULL,
      event_id TEXT NOT NULL,
      payer_id TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL,
      title TEXT NOT NULL,
      notes TEXT,
      expense_date TEXT NOT NULL,
      participant_ids_json TEXT NOT NULL DEFAULT '[]',
      split_method TEXT NOT NULL,
      generated_obligations_json TEXT NOT NULL DEFAULT '[]',
      tags_json TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL,
      verification_status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id TEXT PRIMARY KEY NOT NULL,
      entity_kind TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      action TEXT NOT NULL,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS currency_rates (
      currency TEXT PRIMARY KEY NOT NULL,
      rate_to_sek REAL NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);
}

export async function resetDatabase(db: SQLite.SQLiteDatabase, seed = true) {
  await db.execAsync(`
    DELETE FROM activity_log;
    DELETE FROM shared_expenses;
    DELETE FROM debts;
    DELETE FROM event_members;
    DELETE FROM events;
    DELETE FROM members;
    DELETE FROM tags;
    DELETE FROM currency_rates;
    DELETE FROM app_settings;
  `);

  if (seed) {
    await seedDemoData(db);
  } else {
    await seedDefaults(db);
  }
}

export async function seedIfEmpty(db: SQLite.SQLiteDatabase) {
  await seedDefaults(db);
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT
      (SELECT COUNT(*) FROM members) +
      (SELECT COUNT(*) FROM debts) +
      (SELECT COUNT(*) FROM events) +
      (SELECT COUNT(*) FROM shared_expenses) AS count`,
  );

  if ((row?.count ?? 0) === 0) {
    await seedDemoData(db);
  }
}

export async function seedDefaults(db: SQLite.SQLiteDatabase) {
  const timestamp = nowIso();
  await db.runAsync(`INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)`, [
    'baseCurrency',
    DEFAULT_BASE_CURRENCY,
  ]);
  await db.runAsync(`INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)`, [
    'showEstimatedBase',
    'true',
  ]);
  await db.runAsync(`INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)`, [
    'theme',
    'system',
  ]);

  for (const [currency, rate] of Object.entries(DEFAULT_CURRENCY_RATES_TO_SEK)) {
    await db.runAsync(
      `INSERT OR IGNORE INTO currency_rates (currency, rate_to_sek, updated_at) VALUES (?, ?, ?)`,
      [currency, rate, timestamp],
    );
  }
}

export async function seedDemoData(db: SQLite.SQLiteDatabase) {
  const timestamp = nowIso();
  const members: Member[] = [
    {
      id: 'member_dad',
      displayName: 'Dad',
      notes: 'Family ledger contact. Phone kept as a future linking placeholder.',
      email: 'dad@example.com',
      phone: '+46700000001',
      tags: ['Family'],
      archived: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: 'member_ben_dad',
      displayName: "Benjamin's Dad",
      notes: 'Possible duplicate demo member for Stage 1 warnings.',
      email: null,
      phone: '+46700000001',
      tags: ['Family'],
      archived: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: 'member_daniel',
      displayName: 'Daniel',
      notes: 'Housemate and regular trip organiser.',
      email: 'daniel@example.com',
      phone: null,
      tags: ['Friends', 'Apartment'],
      archived: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: 'member_sarah',
      displayName: 'Sarah',
      notes: 'Often pays shared groceries.',
      email: 'sarah@example.com',
      phone: null,
      tags: ['Friends', 'Food'],
      archived: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: 'member_emma',
      displayName: 'Emma',
      notes: 'Travel friend.',
      email: 'emma@example.com',
      phone: null,
      tags: ['Friends', 'Travel'],
      archived: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];

  const events: Event[] = [
    {
      id: 'event_ski_sweden',
      name: 'Ski Trip Sweden',
      notes: 'Cabin, groceries, fuel, and rentals.',
      defaultCurrency: 'SEK',
      tags: ['Travel', 'Food'],
      status: 'active',
      archived: false,
      ignoredDuplicateKeys: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: 'event_christmas',
      name: 'Christmas 2025',
      notes: 'Gifts and family dinner planning.',
      defaultCurrency: 'SEK',
      tags: ['Family', 'Gift', 'Christmas 2025'],
      status: 'planning',
      archived: false,
      ignoredDuplicateKeys: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: 'event_apartment',
      name: 'Apartment expenses',
      notes: 'Utilities and shared household supplies.',
      defaultCurrency: 'USD',
      tags: ['Apartment', 'Rent'],
      status: 'active',
      archived: false,
      ignoredDuplicateKeys: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];

  const eventMembers: EventMember[] = [
    { eventId: 'event_ski_sweden', memberId: 'member_daniel', createdAt: timestamp },
    { eventId: 'event_ski_sweden', memberId: 'member_sarah', createdAt: timestamp },
    { eventId: 'event_ski_sweden', memberId: 'member_emma', createdAt: timestamp },
    { eventId: 'event_christmas', memberId: 'member_dad', createdAt: timestamp },
    { eventId: 'event_christmas', memberId: 'member_ben_dad', createdAt: timestamp },
    { eventId: 'event_apartment', memberId: 'member_daniel', createdAt: timestamp },
    { eventId: 'event_apartment', memberId: 'member_sarah', createdAt: timestamp },
  ];

  const debts: Debt[] = [
    {
      id: 'debt_dad_gift',
      type: 'simple',
      memberId: 'member_dad',
      direction: 'they_owe_me',
      amount: 250,
      currency: 'SEK',
      title: 'Christmas gift balance',
      notes: 'Dad asked me to buy the joint gift first.',
      debtDate: todayIsoDate(),
      dueDate: null,
      tags: ['Family', 'Gift'],
      eventId: 'event_christmas',
      status: 'active',
      verificationStatus: 'local_only',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: 'debt_daniel_backpack',
      type: 'simple',
      memberId: 'member_daniel',
      direction: 'i_owe_them',
      amount: 50,
      currency: 'AUD',
      title: 'Borrowed backpack',
      notes: 'Bought while Daniel was in Sydney.',
      debtDate: todayIsoDate(),
      dueDate: null,
      tags: ['Travel'],
      eventId: null,
      status: 'active',
      verificationStatus: 'verified',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: 'debt_sarah_dinner',
      type: 'simple',
      memberId: 'member_sarah',
      direction: 'they_owe_me',
      amount: 42,
      currency: 'EUR',
      title: 'Dinner booking deposit',
      notes: 'Deposit covered before the trip.',
      debtDate: todayIsoDate(),
      dueDate: null,
      tags: ['Food', 'Travel'],
      eventId: null,
      status: 'active',
      verificationStatus: 'pending',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: 'debt_emma_rejected',
      type: 'simple',
      memberId: 'member_emma',
      direction: 'they_owe_me',
      amount: 85,
      currency: 'GBP',
      title: 'Train change fee',
      notes: 'Rejected locally in this demo; kept in the private ledger.',
      debtDate: todayIsoDate(),
      dueDate: null,
      tags: ['Travel'],
      eventId: 'event_ski_sweden',
      status: 'active',
      verificationStatus: 'rejected',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];

  const sharedExpenses: SharedExpense[] = [
    withGeneratedObligations({
      id: 'expense_ski_groceries',
      eventId: 'event_ski_sweden',
      payerId: 'me',
      amount: 1200,
      currency: 'SEK',
      title: 'Cabin groceries',
      notes: 'You paid. Split between everyone in the cabin.',
      expenseDate: todayIsoDate(),
      participantIds: ['me', 'member_daniel', 'member_sarah', 'member_emma'],
      splitMethod: 'equal',
      tags: ['Food', 'Travel'],
      status: 'active',
      verificationStatus: 'local_only',
      createdAt: timestamp,
      updatedAt: timestamp,
    }),
    withGeneratedObligations({
      id: 'expense_ski_rentals',
      eventId: 'event_ski_sweden',
      payerId: 'member_daniel',
      amount: 360,
      currency: 'EUR',
      title: 'Ski rentals',
      notes: 'Daniel paid for three rental sets.',
      expenseDate: todayIsoDate(),
      participantIds: ['me', 'member_daniel', 'member_sarah'],
      splitMethod: 'equal',
      tags: ['Travel'],
      status: 'active',
      verificationStatus: 'verified',
      createdAt: timestamp,
      updatedAt: timestamp,
    }),
    withGeneratedObligations({
      id: 'expense_apartment_utilities',
      eventId: 'event_apartment',
      payerId: 'member_sarah',
      amount: 180,
      currency: 'USD',
      title: 'Utilities',
      notes: 'Manually marked disputed for the demo.',
      expenseDate: todayIsoDate(),
      participantIds: ['me', 'member_daniel', 'member_sarah'],
      splitMethod: 'equal',
      tags: ['Apartment', 'Rent'],
      status: 'active',
      verificationStatus: 'disputed',
      createdAt: timestamp,
      updatedAt: timestamp,
    }),
  ];

  for (const member of members) {
    await insertMember(db, member);
  }
  for (const event of events) {
    await insertEvent(db, event);
  }
  for (const eventMember of eventMembers) {
    await insertEventMember(db, eventMember);
  }
  for (const debt of debts) {
    await insertDebt(db, debt);
  }
  for (const expense of sharedExpenses) {
    await insertSharedExpense(db, expense);
  }

  await upsertTagNames(db, [
    'Family',
    'Friends',
    'Food',
    'Travel',
    'Rent',
    'Gift',
    'Christmas 2025',
    'Petrol',
    'Apartment',
  ]);
}

export async function loadSnapshot(db: SQLite.SQLiteDatabase): Promise<DatabaseSnapshot> {
  const [members, debts, events, eventMembers, sharedExpenses, tags, currencyRates, settings] =
    await Promise.all([
      getMembers(db),
      getDebts(db),
      getEvents(db),
      getEventMembers(db),
      getSharedExpenses(db),
      getTags(db),
      getCurrencyRates(db),
      getSettings(db),
    ]);

  return {
    members,
    debts,
    events,
    eventMembers,
    sharedExpenses,
    tags,
    currencyRates,
    settings,
  };
}

export async function getMembers(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<MemberRow>(`SELECT * FROM members ORDER BY display_name COLLATE NOCASE`);
  return rows.map(mapMemberRow);
}

export async function getDebts(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<DebtRow>(`SELECT * FROM debts ORDER BY debt_date DESC, created_at DESC`);
  return rows.map(mapDebtRow);
}

export async function getEvents(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<EventRow>(`SELECT * FROM events ORDER BY updated_at DESC`);
  return rows.map(mapEventRow);
}

export async function getEventMembers(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<EventMemberRow>(`SELECT * FROM event_members`);
  return rows.map((row) => ({
    eventId: row.event_id,
    memberId: row.member_id,
    createdAt: row.created_at,
  }));
}

export async function getSharedExpenses(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<SharedExpenseRow>(
    `SELECT * FROM shared_expenses ORDER BY expense_date DESC, created_at DESC`,
  );
  return rows.map(mapSharedExpenseRow);
}

export async function getTags(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<TagRow>(`SELECT * FROM tags ORDER BY name COLLATE NOCASE`);
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    color: row.color,
    createdAt: row.created_at,
  }));
}

export async function getCurrencyRates(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<RateRow>(`SELECT * FROM currency_rates ORDER BY currency`);
  return rows.map((row) => ({
    currency: row.currency,
    rateToSek: row.rate_to_sek,
    updatedAt: row.updated_at,
  }));
}

export async function getSettings(db: SQLite.SQLiteDatabase): Promise<AppSettings> {
  const rows = await db.getAllAsync<SettingRow>(`SELECT * FROM app_settings`);
  const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  return {
    baseCurrency: ((values.baseCurrency as CurrencyCode | undefined) ?? DEFAULT_BASE_CURRENCY),
    showEstimatedBase: values.showEstimatedBase !== 'false',
    theme: values.theme === 'light' || values.theme === 'dark' ? values.theme : 'system',
  };
}

export async function insertMember(db: SQLite.SQLiteDatabase, member: Member) {
  await db.runAsync(
    `INSERT OR REPLACE INTO members
      (id, display_name, notes, email, phone, tags_json, archived, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      member.id,
      member.displayName,
      member.notes,
      member.email,
      member.phone,
      toJson(member.tags),
      member.archived ? 1 : 0,
      member.createdAt,
      member.updatedAt,
    ],
  );
  await upsertTagNames(db, member.tags);
}

export async function insertDebt(db: SQLite.SQLiteDatabase, debt: Debt) {
  await db.runAsync(
    `INSERT OR REPLACE INTO debts
      (id, member_id, direction, amount, currency, title, notes, debt_date, due_date, tags_json,
       event_id, status, verification_status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      debt.id,
      debt.memberId,
      debt.direction,
      debt.amount,
      debt.currency,
      debt.title,
      debt.notes,
      debt.debtDate,
      debt.dueDate,
      toJson(debt.tags),
      debt.eventId,
      debt.status,
      debt.verificationStatus,
      debt.createdAt,
      debt.updatedAt,
    ],
  );
  await upsertTagNames(db, debt.tags);
}

export async function insertEvent(db: SQLite.SQLiteDatabase, event: Event) {
  await db.runAsync(
    `INSERT OR REPLACE INTO events
      (id, name, notes, default_currency, tags_json, status, archived, ignored_duplicate_keys_json,
       created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      event.id,
      event.name,
      event.notes,
      event.defaultCurrency,
      toJson(event.tags),
      event.status,
      event.archived ? 1 : 0,
      toJson(event.ignoredDuplicateKeys),
      event.createdAt,
      event.updatedAt,
    ],
  );
  await upsertTagNames(db, event.tags);
}

export async function insertEventMember(db: SQLite.SQLiteDatabase, eventMember: EventMember) {
  await db.runAsync(
    `INSERT OR REPLACE INTO event_members (event_id, member_id, created_at) VALUES (?, ?, ?)`,
    [eventMember.eventId, eventMember.memberId, eventMember.createdAt],
  );
}

export async function insertSharedExpense(db: SQLite.SQLiteDatabase, expense: SharedExpense) {
  await db.runAsync(
    `INSERT OR REPLACE INTO shared_expenses
      (id, event_id, payer_id, amount, currency, title, notes, expense_date, participant_ids_json,
       split_method, generated_obligations_json, tags_json, status, verification_status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      expense.id,
      expense.eventId,
      expense.payerId,
      expense.amount,
      expense.currency,
      expense.title,
      expense.notes,
      expense.expenseDate,
      toJson(expense.participantIds),
      expense.splitMethod,
      toJson(expense.generatedObligations),
      toJson(expense.tags),
      expense.status,
      expense.verificationStatus,
      expense.createdAt,
      expense.updatedAt,
    ],
  );
  await upsertTagNames(db, expense.tags);
}

export async function deleteEventMember(db: SQLite.SQLiteDatabase, eventId: string, memberId: string) {
  await db.runAsync(`DELETE FROM event_members WHERE event_id = ? AND member_id = ?`, [eventId, memberId]);
}

export async function updateSetting(db: SQLite.SQLiteDatabase, key: keyof AppSettings, value: string) {
  await db.runAsync(`INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)`, [key, value]);
}

export async function updateCurrencyRate(db: SQLite.SQLiteDatabase, currency: CurrencyCode, rateToSek: number) {
  await db.runAsync(
    `INSERT OR REPLACE INTO currency_rates (currency, rate_to_sek, updated_at) VALUES (?, ?, ?)`,
    [currency, rateToSek, nowIso()],
  );
}

export async function upsertTagNames(db: SQLite.SQLiteDatabase, tagNames: string[]) {
  const timestamp = nowIso();
  const colors = ['#DCEDE8', '#FCE7E1', '#E4ECFA', '#FEF2D2', '#EEE8F8', '#E7F0DD'];
  const unique = Array.from(new Set(tagNames.map((tag) => tag.trim()).filter(Boolean)));

  for (let index = 0; index < unique.length; index += 1) {
    const name = unique[index];
    await db.runAsync(`INSERT OR IGNORE INTO tags (id, name, color, created_at) VALUES (?, ?, ?, ?)`, [
      createId('tag'),
      name,
      colors[index % colors.length],
      timestamp,
    ]);
  }
}

export function mapMemberRow(row: MemberRow): Member {
  return {
    id: row.id,
    displayName: row.display_name,
    notes: row.notes,
    email: row.email,
    phone: row.phone,
    tags: parseJsonArray<string>(row.tags_json),
    archived: row.archived === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapDebtRow(row: DebtRow): Debt {
  return {
    id: row.id,
    type: 'simple',
    memberId: row.member_id,
    direction: row.direction,
    amount: row.amount,
    currency: row.currency,
    title: row.title,
    notes: row.notes,
    debtDate: row.debt_date,
    dueDate: row.due_date,
    tags: parseJsonArray<string>(row.tags_json),
    eventId: row.event_id,
    status: row.status,
    verificationStatus: row.verification_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapEventRow(row: EventRow): Event {
  return {
    id: row.id,
    name: row.name,
    notes: row.notes,
    defaultCurrency: row.default_currency,
    tags: parseJsonArray<string>(row.tags_json),
    status: row.status,
    archived: row.archived === 1,
    ignoredDuplicateKeys: parseJsonArray<string>(row.ignored_duplicate_keys_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapSharedExpenseRow(row: SharedExpenseRow): SharedExpense {
  return {
    id: row.id,
    eventId: row.event_id,
    payerId: row.payer_id,
    amount: row.amount,
    currency: row.currency,
    title: row.title,
    notes: row.notes,
    expenseDate: row.expense_date,
    participantIds: parseJsonArray(row.participant_ids_json),
    splitMethod: row.split_method,
    generatedObligations: parseJsonArray(row.generated_obligations_json),
    tags: parseJsonArray<string>(row.tags_json),
    status: row.status,
    verificationStatus: row.verification_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
