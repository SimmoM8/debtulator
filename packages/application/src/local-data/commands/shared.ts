import type { AppSnapshot } from '../../model/AppSnapshot';
import type { SnapshotCoordinator } from '../../state/SnapshotCoordinator';
import type { LocalLedgerUnitOfWork } from '../LocalLedgerPort';

export type LocalLedgerCoordinator = SnapshotCoordinator<
  AppSnapshot,
  LocalLedgerUnitOfWork
>;

export function requireEntity<T extends { id: string }>(
  entities: readonly T[],
  id: string,
  label: string,
): T {
  const entity = entities.find((item) => item.id === id);
  if (!entity) {
    throw new Error(`${label} not found.`);
  }
  return entity;
}
