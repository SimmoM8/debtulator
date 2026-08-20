import type { RestoreResult } from '../../data/backupRestore';
import {
  addTelemetryBreadcrumb,
  captureTelemetryException,
  trackTelemetryEvent,
} from '../../observability/telemetry';
import type {
  AppSettings,
  AuditLog,
  BackupMode,
  ConflictResolution,
  CurrencyCode,
  SyncConflict,
  SyncQueueEntry,
} from '@debtulator/domain/models';
import type {
  CreateCsvImportBatchInput,
  CreateExportLogInput,
  CreateNotificationInput,
  QueueSyncOperationInput,
} from '../LocalLedgerTypes';
import { requireEntity, type LocalLedgerCoordinator } from './shared';

export function createSystemCommands(coordinator: LocalLedgerCoordinator) {
  return {
    resetLocalData: () =>
      coordinator.execute((unitOfWork) => unitOfWork.reset()),
    resetSyncedData: () =>
      coordinator.execute((unitOfWork) => unitOfWork.resetSyncedData()),
    createExportLog: (input: CreateExportLogInput) =>
      coordinator.execute((unitOfWork) => unitOfWork.createExportLog(input)),
    createCsvImportBatch: (input: CreateCsvImportBatchInput) =>
      coordinator.execute((unitOfWork) =>
        unitOfWork.createCsvImportBatch(input),
      ),
    upsertSyncQueueEntry: (entry: SyncQueueEntry) =>
      coordinator.execute((unitOfWork) =>
        unitOfWork.upsertSyncQueueEntry(entry),
      ),
    queueSyncOperation: (input: QueueSyncOperationInput) =>
      coordinator.execute((unitOfWork) =>
        unitOfWork.queueSyncOperation(input),
      ),
    updateSyncQueueEntry: (
      entryId: string,
      patch: Partial<SyncQueueEntry>,
    ) =>
      coordinator.execute((unitOfWork, current) =>
        unitOfWork.markSyncQueueEntry(
          requireEntity(current.syncQueue, entryId, 'Sync queue item'),
          patch,
        ),
      ),
    upsertSyncConflict: (conflict: SyncConflict) =>
      coordinator.execute((unitOfWork) =>
        unitOfWork.upsertSyncConflict(conflict),
      ),
    resolveSyncConflict: async (
      conflictId: string,
      resolution: ConflictResolution,
      actorUserId: string | null = null,
    ) => {
      addTelemetryBreadcrumb('conflict', 'resolution_started', { resolution });
      try {
        const result = await coordinator.execute((unitOfWork, current) =>
          unitOfWork.resolveSyncConflict(
            requireEntity(current.syncConflicts, conflictId, 'Sync conflict'),
            resolution,
            actorUserId,
          ),
        );
        addTelemetryBreadcrumb('conflict', 'resolution_completed', {
          resolution,
          result: 'success',
        });
        trackTelemetryEvent('conflict_resolution_completed', {
          resolution,
          result: 'success',
        });
        return result;
      } catch (error) {
        addTelemetryBreadcrumb('conflict', 'resolution_failed', {
          resolution,
          result: 'failure',
        });
        captureTelemetryException(error, 'conflict_resolution', { resolution });
        throw error;
      }
    },
    createNotification: (input: CreateNotificationInput) =>
      coordinator.execute((unitOfWork) =>
        unitOfWork.createNotification(input),
      ),
    markNotificationRead: (notificationId: string) =>
      coordinator.execute((unitOfWork, current) =>
        unitOfWork.markNotificationRead(
          requireEntity(
            current.notifications,
            notificationId,
            'Notification',
          ),
        ),
      ),
    markAllNotificationsRead: () =>
      coordinator.execute(async (unitOfWork, current) => {
        for (const notification of current.notifications.filter(
          (item) => !item.readAt,
        )) {
          await unitOfWork.markNotificationRead(notification);
        }
      }),
    createAuditLog: (
      input: Omit<AuditLog, 'id' | 'createdAt' | 'deviceId'> & {
        deviceId?: string | null;
      },
    ) =>
      coordinator.execute((unitOfWork) => unitOfWork.createAuditLog(input)),
    restoreBackup: (rawJson: string, mode: BackupMode): Promise<RestoreResult> =>
      coordinator.execute((unitOfWork) =>
        unitOfWork.restoreBackup(rawJson, mode),
      ),
    submitAccountDeletionRequest: (input: {
      userId: string;
      deleteLocalData: boolean;
      keepLocalArchive: boolean;
    }) =>
      coordinator.execute((unitOfWork) =>
        unitOfWork.submitAccountDeletionRequest(input),
      ),
    updateSettings: (settings: Partial<AppSettings>) =>
      coordinator.execute((unitOfWork) => unitOfWork.updateSettings(settings)),
    updateRate: (currency: CurrencyCode, rateToSek: number) =>
      coordinator.execute((unitOfWork) =>
        unitOfWork.updateRate(currency, rateToSek),
      ),
  };
}

export type SystemCommands = ReturnType<typeof createSystemCommands>;
