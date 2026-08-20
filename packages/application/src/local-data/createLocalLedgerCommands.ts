import type { SnapshotCoordinator } from '../state/SnapshotCoordinator';
import type { AppSnapshot } from '../model/AppSnapshot';
import type { LocalLedgerUnitOfWork } from './LocalLedgerPort';
import { createContentCommands } from './commands/contentCommands';
import { createDebtCommands } from './commands/debtCommands';
import { createGroupCommands } from './commands/groupCommands';
import { createMemberCommands } from './commands/memberCommands';
import { createPaymentCommands } from './commands/paymentCommands';
import { createSystemCommands } from './commands/systemCommands';

/**
 * Creates feature-focused local command use cases over one shared FIFO.
 * Every feature therefore observes the same mutation and publication order.
 */
export function createLocalLedgerCommands(
  coordinator: SnapshotCoordinator<AppSnapshot, LocalLedgerUnitOfWork>,
) {
  return {
    ...createMemberCommands(coordinator),
    ...createDebtCommands(coordinator),
    ...createGroupCommands(coordinator),
    ...createPaymentCommands(coordinator),
    ...createContentCommands(coordinator),
    ...createSystemCommands(coordinator),
  };
}

export type LocalLedgerCommands = ReturnType<typeof createLocalLedgerCommands>;

export type MemberCommandFacade = ReturnType<typeof createMemberCommands>;
export type DebtCommandFacade = ReturnType<typeof createDebtCommands>;
export type GroupCommandFacade = ReturnType<typeof createGroupCommands>;
export type PaymentCommandFacade = ReturnType<typeof createPaymentCommands>;
export type ContentCommandFacade = ReturnType<typeof createContentCommands>;
export type SystemCommandFacade = ReturnType<typeof createSystemCommands>;
