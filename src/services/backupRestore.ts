import * as FileSystem from 'expo-file-system/legacy';
import { Share } from 'react-native';

import type { DatabaseSnapshot } from '@/src/data/database';
import { addTelemetryBreadcrumb, captureTelemetryException, trackTelemetryEvent } from '@/src/services/telemetry';
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

export function buildBackup(snapshot: DatabaseSnapshot, options: BackupOptions): DebtulatorBackup {
  addTelemetryBreadcrumb('backup', 'build_started', {
    includeAttachments: options.includeAttachments,
    includePrivateNotes: options.includePrivateNotes,
  });
  return {
    app: 'Debtulator',
    schemaVersion: 6,
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
      attachments: options.includeAttachments ? snapshot.attachments.map((attachment) => ({ ...attachment, remoteUrl: null, storagePath: null })) : [],
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
  try {
    await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(backup, null, 2));
    await Share.share({ url: fileUri, message: 'Debtulator backup export' });
    addTelemetryBreadcrumb('backup', 'share_completed', {
      includeAttachments: backup.privacy.includesAttachments,
      includePrivateNotes: backup.privacy.includesPrivateNotes,
      result: 'success',
    });
    trackTelemetryEvent('backup_created', {
      includeAttachments: backup.privacy.includesAttachments,
      includePrivateNotes: backup.privacy.includesPrivateNotes,
      result: 'success',
    });
    return fileUri;
  } catch (error) {
    addTelemetryBreadcrumb('backup', 'share_failed', { result: 'failure' });
    captureTelemetryException(error, 'backup_share', {});
    throw error;
  }
}

export function previewRestore(rawJson: string): RestorePreview {
  try {
    const parsed = JSON.parse(rawJson) as Partial<DebtulatorBackup>;
    const data = parsed.data as Record<string, unknown> | undefined;
    const warnings: string[] = [];
    if (parsed.app !== 'Debtulator') {
      warnings.push('This does not look like a Debtulator backup.');
    }
    if (parsed.schemaVersion !== 6) {
      warnings.push('Backup schema differs from this app version.');
    }
    if (parsed.privacy?.restoredRecordsDefaultPrivate !== true) {
      warnings.push('Shared metadata will be restored as private unless explicitly confirmed.');
    }
    const preview: RestorePreview = {
      valid: Boolean(data),
      schemaVersion: typeof parsed.schemaVersion === 'number' ? parsed.schemaVersion : null,
      memberCount: countArray(data?.members),
      debtCount: countArray(data?.debts),
      eventCount: countArray(data?.events),
      paymentCount: countArray(data?.payments),
      settlementCount: countArray(data?.settlements),
      warnings,
    };
    addTelemetryBreadcrumb('restore', preview.valid ? 'preview_valid' : 'preview_invalid', {
      valid: preview.valid,
      schemaVersion: preview.schemaVersion ?? 0,
      memberCount: preview.memberCount,
      debtCount: preview.debtCount,
      eventCount: preview.eventCount,
      paymentCount: preview.paymentCount,
      settlementCount: preview.settlementCount,
      warningsCount: preview.warnings.length,
    });
    trackTelemetryEvent(preview.valid ? 'restore_preview_valid' : 'restore_preview_invalid', {
      valid: preview.valid,
      warningsCount: preview.warnings.length,
    });
    return preview;
  } catch {
    addTelemetryBreadcrumb('restore', 'preview_invalid', { valid: false, warningsCount: 1 });
    trackTelemetryEvent('restore_preview_invalid', { valid: false, warningsCount: 1 });
    return {
      valid: false,
      schemaVersion: null,
      memberCount: 0,
      debtCount: 0,
      eventCount: 0,
      paymentCount: 0,
      settlementCount: 0,
      warnings: ['Backup file is not valid JSON.'],
    };
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
