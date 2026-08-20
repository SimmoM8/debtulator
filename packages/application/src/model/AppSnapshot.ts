import type {
  ActivityLog,
  AppNotification,
  AppSettings,
  Attachment,
  AuditLog,
  Comment,
  CsvImportBatch,
  CurrencyRate,
  Debt,
  DebtVerification,
  ExpensePayer,
  ExportLog,
  Group,
  GroupActivityLog,
  GroupDebt,
  GroupDuplicateWarning,
  GroupInvite,
  GroupMember,
  GroupMemberClaim,
  GroupParticipant,
  GroupVerificationResponse,
  LinkRequest,
  Member,
  OverpaymentCredit,
  Payment,
  RecurringTemplate,
  Reminder,
  Settlement,
  SettlementLine,
  SharedExpense,
  SharedGroupMember,
  SmartSuggestion,
  SoftReminder,
  SyncConflict,
  SyncQueueEntry,
  Tag,
  UserProfile,
} from '@debtulator/domain/models';

/**
 * Framework-independent application state exposed by the local data source.
 *
 * SQLite owns persistence, but higher layers consume this model without
 * depending on SQLite types or database implementation details.
 */
export type AppSnapshot = {
  profiles: UserProfile[];
  members: Member[];
  debts: Debt[];
  groups: Group[];
  groupMembers: GroupMember[];
  groupParticipants: GroupParticipant[];
  groupInvites: GroupInvite[];
  sharedGroupMembers: SharedGroupMember[];
  groupMemberClaims: GroupMemberClaim[];
  groupDuplicateWarnings: GroupDuplicateWarning[];
  sharedExpenses: SharedExpense[];
  groupDebts: GroupDebt[];
  payments: Payment[];
  settlements: Settlement[];
  settlementLines: SettlementLine[];
  expensePayers: ExpensePayer[];
  recurringTemplates: RecurringTemplate[];
  reminders: Reminder[];
  softReminders: SoftReminder[];
  overpaymentCredits: OverpaymentCredit[];
  groupVerificationResponses: GroupVerificationResponse[];
  groupActivityLogs: GroupActivityLog[];
  linkRequests: LinkRequest[];
  debtVerifications: DebtVerification[];
  activityLogs: ActivityLog[];
  attachments: Attachment[];
  comments: Comment[];
  smartSuggestions: SmartSuggestion[];
  exportLogs: ExportLog[];
  csvImportBatches: CsvImportBatch[];
  syncQueue: SyncQueueEntry[];
  syncConflicts: SyncConflict[];
  notifications: AppNotification[];
  auditLogs: AuditLog[];
  tags: Tag[];
  currencyRates: CurrencyRate[];
  settings: AppSettings;
};
