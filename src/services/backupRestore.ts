import * as FileSystem from 'expo-file-system/legacy';
import { Share } from 'react-native';

import type { DatabaseSnapshot } from '@/src/data/database';
import { sanitizeAttachmentsForPortableExport } from '@/src/services/export';
import type { BackupMode } from '@/src/types/models';

export type BackupOptions = {
  includeAttachments: boolean;
  includePrivateNotes: boolean;
};

export type DebtulatorBackup = {
  app: 'Debtulator';
  schemaVersion: 6;
  exportedAt: string;
  privacy: {
    includesAttachments: boolean;
    includesPrivateNotes: boolean;
    restoredRecordsDefaultPrivate: true;
  };
  data: Record<string, unknown>;
};

export type RestorePreview = {
  valid: boolean;
  schemaVersion: number | null;
  memberCount: number;
  debtCount: number;
  eventCount: number;
  paymentCount: number;
  settlementCount: number;
  warnings: string[];
};

export const RESTORE_PREVIEW_MAX_BYTES = 5 * 1024 * 1024;
export const BACKUP_SCHEMA_VERSION = 6;

export function buildBackup(snapshot: DatabaseSnapshot, options: BackupOptions): DebtulatorBackup {
  const attachments = options.includeAttachments ? sanitizeAttachmentsForPortableExport(snapshot.attachments) : [];
  return {
    app: 'Debtulator',
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    privacy: {
      includesAttachments: options.includeAttachments,
      includesPrivateNotes: options.includePrivateNotes,
      restoredRecordsDefaultPrivate: true,
    },
    data: {
      profiles: snapshot.profiles,
      members: snapshot.members.map((member) => scrubNotes(member, options.includePrivateNotes)),
      debts: snapshot.debts.map((debt) => scrubNotes({ ...debt, visibility: 'private', syncStatus: 'local_only' }, options.includePrivateNotes)),
      events: snapshot.events.map((event) => scrubNotes({ ...event, visibility: 'private', syncStatus: 'local_only' }, options.includePrivateNotes)),
      eventMembers: snapshot.eventMembers,
      sharedEventMembers: snapshot.sharedEventMembers.map((member) => scrubNotes({ ...member, syncStatus: 'local_only' }, options.includePrivateNotes)),
      sharedExpenses: snapshot.sharedExpenses.map((expense) =>
        scrubNotes({ ...expense, visibility: 'private', syncStatus: 'local_only' }, options.includePrivateNotes),
      ),
      eventDebts: snapshot.eventDebts.map((debt) => scrubNotes({ ...debt, syncStatus: 'local_only' }, options.includePrivateNotes)),
      payments: snapshot.payments.map((payment) => scrubNotes({ ...payment, visibility: 'private', syncStatus: 'local_only' }, options.includePrivateNotes)),
      settlements: snapshot.settlements.map((settlement) => scrubNotes({ ...settlement, syncStatus: 'local_only' }, options.includePrivateNotes)),
      settlementLines: snapshot.settlementLines,
      expensePayers: snapshot.expensePayers,
      tags: snapshot.tags,
      comments: options.includePrivateNotes ? snapshot.comments.map((comment) => ({ ...comment, visibility: 'private', syncStatus: 'local_only' })) : [],
      attachments,
      recurringTemplates: snapshot.recurringTemplates,
      reminders: snapshot.reminders,
      softReminders: snapshot.softReminders,
      overpaymentCredits: snapshot.overpaymentCredits,
      smartSuggestions: snapshot.smartSuggestions,
      settings: snapshot.settings,
      currencyRates: snapshot.currencyRates,
      auditLogs: snapshot.auditLogs,
    },
  };
}

export async function shareBackupFile(backup: DebtulatorBackup) {
  const directory = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
  if (!directory) {
    throw new Error('No writable document directory is available for backup export.');
  }
  const fileUri = `${directory}debtulator-backup-${backup.exportedAt.slice(0, 10)}.json`;
  await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(backup, null, 2));
  await Share.share({ url: fileUri, message: 'Debtulator backup export' });
  return fileUri;
}

export function previewRestore(rawJson: string): RestorePreview {
  const trimmed = rawJson.trim();
  if (!trimmed) {
    return invalidPreview('Backup payload is empty.');
  }
  if (trimmed.length > RESTORE_PREVIEW_MAX_BYTES) {
    return invalidPreview(`Backup payload exceeds ${Math.round(RESTORE_PREVIEW_MAX_BYTES / 1024 / 1024)} MB preview limit.`);
  }
  try {
    const parsed = JSON.parse(rawJson) as Partial<DebtulatorBackup>;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return invalidPreview('Backup JSON must be an object payload.');
    }
    const data = isRecord(parsed.data) ? parsed.data : null;
    const warnings: string[] = [];
    const valid = parsed.app === 'Debtulator' && Boolean(data);
    if (parsed.app !== 'Debtulator') {
      warnings.push('This does not look like a Debtulator backup.');
    }
    if (parsed.schemaVersion !== BACKUP_SCHEMA_VERSION) {
      warnings.push(schemaWarning(parsed.schemaVersion));
    }
    if (parsed.privacy?.restoredRecordsDefaultPrivate !== true) {
      warnings.push('Shared metadata will be restored as private unless explicitly confirmed.');
    }
    if (!data) {
      warnings.push('Backup payload is missing a valid data object.');
    }
    pushNonArrayWarning(data, 'members', warnings);
    pushNonArrayWarning(data, 'debts', warnings);
    pushNonArrayWarning(data, 'events', warnings);
    pushNonArrayWarning(data, 'payments', warnings);
    pushNonArrayWarning(data, 'settlements', warnings);
    return {
      valid,
      schemaVersion: typeof parsed.schemaVersion === 'number' ? parsed.schemaVersion : null,
      memberCount: countArray(data?.members),
      debtCount: countArray(data?.debts),
      eventCount: countArray(data?.events),
      paymentCount: countArray(data?.payments),
      settlementCount: countArray(data?.settlements),
      warnings,
    };
  } catch {
    return invalidPreview('Backup file is not valid JSON.');
  }
}

export function restoreModeDescription(mode: BackupMode) {
  switch (mode) {
    case 'merge':
      return 'Merge safe local/private copies into the current device ledger.';
    case 'replace_local':
      return 'Replace local data after confirmation; synced history is not overwritten blindly.';
    case 'duplicate_private':
      return 'Import every restored record as a separate private copy.';
  }
}

function countArray(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

function invalidPreview(warning: string): RestorePreview {
  return {
    valid: false,
    schemaVersion: null,
    memberCount: 0,
    debtCount: 0,
    eventCount: 0,
    paymentCount: 0,
    settlementCount: 0,
    warnings: [warning],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function pushNonArrayWarning(data: Record<string, unknown> | null, key: string, warnings: string[]) {
  if (!data || !(key in data) || Array.isArray(data[key])) {
    return;
  }
  warnings.push(`Backup data field "${key}" is malformed and will be treated as empty.`);
}

function schemaWarning(schemaVersion: unknown) {
  if (typeof schemaVersion !== 'number') {
    return 'Backup schema is missing or invalid.';
  }
  if (schemaVersion < BACKUP_SCHEMA_VERSION) {
    return 'Backup schema is older than this app version.';
  }
  return 'Backup schema is newer than this app version.';
}

function scrubNotes<T extends { notes?: string | null; sharedNotes?: string | null }>(record: T, includePrivateNotes: boolean) {
  if (includePrivateNotes) {
    return record;
  }
  return {
    ...record,
    notes: null,
    sharedNotes: record.sharedNotes ?? null,
  };
}
