import { describe, expect, it } from "@jest/globals";

import type { AppSnapshot } from "@/src/application/model/AppSnapshot";
import type {
    AppSettings,
    Group,
    Payment,
    SharedGroupMember,
} from "@/src/domain/models";
import {
    getLocalIdForRemoteId,
    getRemoteIdForLocalId,
    mapLocalPaymentToRemote,
    mapRemotePaymentToLocal,
    SyncMappingError,
} from "@/src/infrastructure/sync/mappers";

const timestamp = "2026-08-18T12:00:00.000Z";

type SnapshotOverrides = Partial<Omit<AppSnapshot, "settings">> & {
  settings?: Partial<AppSettings>;
};

const defaultSettings: AppSettings = {
  baseCurrency: "SEK",
  hasCompletedFirstRun: true,
  localDisplayName: "Alex",
  showEstimatedBase: true,
  theme: "system",
  convertedSettlementOptIn: false,
  defaultReminderPreference: "none",
  recurringGenerationPreference: "prompt",
  includePendingSettlements: false,
  includeRejectedDisputedSettlements: false,
  verifiedOnlySettlements: false,
  smartSuggestionsEnabled: true,
  analyticsEstimatedCurrencyMode: false,
  attachmentUploadPreference: "ask",
  includePrivateNotesInExports: false,
  includeRejectedDisputedInExports: false,
  includeArchivedInExports: false,
  includeCommentsInExports: false,
  includeAttachmentsInExports: false,
  defaultDebtVisibility: "private",
  defaultGroupVisibility: "private",
  showSensitiveDetailsInNotifications: false,
  syncPrivateLocalDataToAccountBackup: false,
  uploadAttachmentsForSharedRecords: false,
  analyticsIncludeRejectedDisputed: false,
  smartSuggestionsPrivateOnly: true,
  pushNotificationsEnabled: false,
  emailNotificationsEnabled: false,
  notificationVerificationEnabled: true,
  notificationGroupEnabled: true,
  notificationPaymentSettlementEnabled: true,
  notificationReminderEnabled: true,
  notificationCommentEnabled: false,
  quietHoursEnabled: false,
  quietHoursStart: "22:00",
  quietHoursEnd: "07:00",
  language: "system",
  backupIncludeAttachments: false,
  backupIncludePrivateNotes: false,
  betaTelemetryEnabled: true,
  betaCrashReportingEnabled: true,
  lastBackupAt: null,
};

/** A complete but minimal snapshot for sync-boundary characterization tests. */
function createAppSnapshotFixture(
  overrides: SnapshotOverrides = {},
): AppSnapshot {
  const snapshot: AppSnapshot = {
    profiles: [],
    members: [],
    debts: [],
    groups: [],
    groupMembers: [],
    groupParticipants: [],
    groupInvites: [],
    sharedGroupMembers: [],
    groupMemberClaims: [],
    groupDuplicateWarnings: [],
    sharedExpenses: [],
    groupDebts: [],
    payments: [],
    settlements: [],
    settlementLines: [],
    expensePayers: [],
    recurringTemplates: [],
    reminders: [],
    softReminders: [],
    overpaymentCredits: [],
    groupVerificationResponses: [],
    groupActivityLogs: [],
    linkRequests: [],
    debtVerifications: [],
    activityLogs: [],
    attachments: [],
    comments: [],
    smartSuggestions: [],
    exportLogs: [],
    csvImportBatches: [],
    syncQueue: [],
    syncConflicts: [],
    notifications: [],
    auditLogs: [],
    tags: [],
    currencyRates: [],
    settings: { ...defaultSettings },
  };

  return {
    ...snapshot,
    ...overrides,
    settings: {
      ...snapshot.settings,
      ...overrides.settings,
    },
  };
}

const group: Group = {
  id: "group-local-stockholm",
  localId: "group-client-stockholm",
  remoteId: "group-remote-stockholm",
  ownerUserId: "user-alex",
  name: "Stockholm weekend",
  notes: "Shared trip costs",
  defaultCurrency: "SEK",
  allowedCurrencies: ["SEK", "EUR"],
  tags: ["travel"],
  status: "active",
  visibility: "shared",
  syncStatus: "synced",
  archived: false,
  archivedAt: null,
  finalisedAt: null,
  lockedAt: null,
  ignoredDuplicateKeys: [],
  createdAt: timestamp,
  updatedAt: timestamp,
};

const payer: SharedGroupMember = {
  id: "group-member-local-alex",
  remoteId: "group-member-remote-alex",
  groupId: group.id,
  remoteGroupId: group.remoteId,
  type: "linked_user",
  linkedUserId: "user-alex",
  displayName: "Alex",
  alias: null,
  email: "alex@example.com",
  phone: null,
  notes: null,
  createdByUserId: "user-alex",
  status: "active",
  mergedIntoGroupMemberId: null,
  createdAt: timestamp,
  updatedAt: timestamp,
  syncStatus: "synced",
};

const payee: SharedGroupMember = {
  ...payer,
  id: "group-member-local-sam",
  remoteId: "group-member-remote-sam",
  linkedUserId: "user-sam",
  displayName: "Sam",
  email: "sam@example.com",
};

const payment: Payment = {
  id: "payment-local-dinner",
  localId: "payment-client-dinner",
  remoteId: "payment-remote-dinner",
  createdByUserId: "user-alex",
  payerUserId: "user-alex",
  payeeUserId: "user-sam",
  payerMemberId: null,
  payeeMemberId: null,
  payerGroupMemberId: payer.id,
  payeeGroupMemberId: payee.id,
  groupId: group.id,
  relatedMemberId: "member-local-sam",
  amount: 129.45,
  currency: "SEK",
  paymentDate: "2026-08-18",
  notes: "Dinner reimbursement",
  status: "recorded",
  confirmationStatus: "pending_confirmation",
  visibility: "shared_group",
  createdAt: timestamp,
  updatedAt: timestamp,
  archivedAt: null,
  syncStatus: "pending_update",
};

describe("Supabase sync mappers", () => {
  it("translates stable local and remote identifiers in both directions", () => {
    const snapshot = createAppSnapshotFixture({
      groups: [group],
      sharedGroupMembers: [payer, payee],
      payments: [payment],
    });

    expect(getRemoteIdForLocalId(snapshot, "group", group.id)).toBe(
      group.remoteId,
    );
    expect(getLocalIdForRemoteId(snapshot, "group", group.remoteId)).toBe(
      group.id,
    );
    expect(getRemoteIdForLocalId(snapshot, "group_member", payee.id)).toBe(
      payee.remoteId,
    );
    expect(getLocalIdForRemoteId(snapshot, "payment", payment.remoteId)).toBe(
      payment.id,
    );
    expect(
      getRemoteIdForLocalId(snapshot, "payment", "payment-missing"),
    ).toBeNull();
    expect(getLocalIdForRemoteId(snapshot, "group", undefined)).toBeNull();
  });

  it("maps a financial DTO without losing privacy or pending local sync state", () => {
    const snapshot = createAppSnapshotFixture({
      groups: [group],
      sharedGroupMembers: [payer, payee],
      payments: [payment],
    });

    expect(mapLocalPaymentToRemote(payment, snapshot)).toMatchObject({
      client_generated_id: payment.localId,
      group_id: group.remoteId,
      payer_group_member_id: payer.remoteId,
      payee_group_member_id: payee.remoteId,
      amount: 129.45,
      currency: "SEK",
      confirmation_status: "pending_confirmation",
      visibility: "shared_group",
    });

    const mapped = mapRemotePaymentToLocal(
      {
        id: payment.remoteId,
        client_generated_id: payment.localId,
        created_by_user_id: "user-alex",
        payer_user_id: "user-alex",
        payee_user_id: "user-sam",
        payer_member_id: null,
        payee_member_id: null,
        payer_group_member_id: payer.remoteId,
        payee_group_member_id: payee.remoteId,
        group_id: group.remoteId,
        amount: "129.45",
        currency: "SEK",
        payment_date: "2026-08-18",
        notes: "Dinner reimbursement",
        status: "recorded",
        confirmation_status: "pending_confirmation",
        visibility: "shared_group",
        archived_at: null,
        created_at: timestamp,
        updated_at: "2026-08-18T13:00:00.000Z",
      },
      snapshot,
    );

    expect(mapped).toMatchObject({
      id: payment.id,
      localId: payment.localId,
      remoteId: payment.remoteId,
      groupId: group.id,
      payerGroupMemberId: payer.id,
      payeeGroupMemberId: payee.id,
      relatedMemberId: payment.relatedMemberId,
      amount: 129.45,
      currency: "SEK",
      confirmationStatus: "pending_confirmation",
      visibility: "shared_group",
      syncStatus: "pending_update",
    });
  });

  it("reports a typed mapping error when a required relation has no remote id", () => {
    const snapshot = createAppSnapshotFixture({
      groups: [group],
      sharedGroupMembers: [payer],
    });
    let caught: unknown;

    try {
      mapLocalPaymentToRemote(payment, snapshot);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(SyncMappingError);
    expect(caught).toMatchObject({
      name: "SyncMappingError",
      code: "mapping_error",
      message: "Missing remote id for payments.payee_group_member_id.",
      details: {
        entityType: "group_member",
        localId: payee.id,
        field: "payments.payee_group_member_id",
      },
    });
  });
});
