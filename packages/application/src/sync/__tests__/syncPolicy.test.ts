import { describe, expect, it } from '@jest/globals';

import { canRetrySyncEntry, isFinancialConflict, shouldQueueOfflineMutation } from '@debtulator/application/sync/syncPolicy';
import type { SyncConflict, SyncQueueEntry } from '@debtulator/domain/models';

const failedEntry: SyncQueueEntry = {
  id: 'queue-1',
  entityType: 'debt',
  entityId: 'debt-1',
  operation: 'update',
  payload: {},
  dependencyIds: [],
  retryCount: 1,
  status: 'failed',
  errorCode: 'network_error',
  errorMessage: 'offline',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  lastAttemptAt: '2026-01-01T00:00:00.000Z',
};

describe('sync policy', () => {
  it('queues safe shared writes but requires live checks for destructive financial actions', () => {
    expect(
      shouldQueueOfflineMutation({
        entityType: 'debt',
        visibility: 'shared_with_involved_member',
        operation: 'update',
        authenticatedUserId: 'user-1',
      }),
    ).toMatchObject({ canQueue: true, unsafeOffline: false });

    expect(
      shouldQueueOfflineMutation({
        entityType: 'debt',
        visibility: 'shared_with_involved_member',
        operation: 'delete',
        authenticatedUserId: 'user-1',
      }),
    ).toMatchObject({ canQueue: false, unsafeOffline: true });
  });

  it('retries transient failures and blocks permission failures', () => {
    expect(canRetrySyncEntry(failedEntry, '2026-01-01T00:01:00.000Z')).toBe(true);
    expect(
      canRetrySyncEntry(
        { ...failedEntry, errorCode: 'permission_denied' },
        '2026-01-01T00:01:00.000Z',
      ),
    ).toBe(false);
  });

  it('always treats debt conflicts as financial conflicts', () => {
    const conflict: SyncConflict = {
      id: 'conflict-1',
      entityType: 'debt',
      localEntityId: 'debt-1',
      remoteEntityId: 'remote-debt-1',
      conflictType: 'update_update',
      localSnapshot: {},
      remoteSnapshot: {},
      baseSnapshot: null,
      detectedAt: '2026-01-01T00:00:00.000Z',
      status: 'unresolved',
      resolution: null,
      resolvedAt: null,
      resolvedByUserId: null,
    };

    expect(isFinancialConflict(conflict)).toBe(true);
  });
});
