import type {
  ActivityLog,
  AuditLog,
  Debt,
  DebtVerification,
  GroupActivityLog,
  GroupDebt,
  Payment,
  SharedExpense,
  SharedGroupMember,
  UserProfile,
} from "@/src/types/models";

export type UserActivityEvent = {
  id: string;
  action: string;
  actorUserId: string | null;
  targetType: string;
  targetId: string | null;
  createdAt: string;
};

export function buildUserActivity(input: {
  activityLogs: ActivityLog[];
  auditLogs: AuditLog[];
  groupActivityLogs: GroupActivityLog[];
  debts: Debt[];
  debtVerifications: DebtVerification[];
  groupDebts: GroupDebt[];
  payments: Payment[];
  sharedExpenses: SharedExpense[];
  currentUserId: string | null;
}) {
  return [
    ...input.activityLogs.map((activity) => ({
      id: `activity-${activity.id}`,
      action: activity.action,
      actorUserId: activity.actorUserId,
      targetType: activity.entityKind,
      targetId: activity.entityId,
      createdAt: activity.createdAt,
    })),
    ...input.groupActivityLogs.map((activity) => ({
      id: `group-activity-${activity.id}`,
      action: activity.action,
      actorUserId: activity.actorUserId,
      targetType: activity.targetType,
      targetId: activity.targetId ?? activity.groupId,
      createdAt: activity.createdAt,
    })),
    ...input.auditLogs.map((activity) => ({
      id: `audit-${activity.id}`,
      action: activity.action,
      actorUserId: activity.actorUserId,
      targetType: activity.targetType,
      targetId: activity.targetId,
      createdAt: activity.createdAt,
    })),
    ...input.debts.map((debt) => ({
      id: `debt-created-${debt.id}`,
      action: "debt_created",
      actorUserId:
        input.debtVerifications.find(
          (verification) =>
            verification.debtId === debt.id &&
            verification.requestType === "creation",
        )?.requesterUserId ?? input.currentUserId,
      targetType: "debt",
      targetId: debt.id,
      createdAt: debt.createdAt,
    })),
    ...input.sharedExpenses.map((expense) => ({
      id: `expense-created-${expense.id}`,
      action: "shared_expense_created",
      actorUserId: expense.creatorUserId,
      targetType: "shared_expense",
      targetId: expense.id,
      createdAt: expense.createdAt,
    })),
    ...input.groupDebts.map((debt) => ({
      id: `group-debt-created-${debt.id}`,
      action: "group_debt_created",
      actorUserId: debt.creatorUserId,
      targetType: "group_debt",
      targetId: debt.id,
      createdAt: debt.createdAt,
    })),
    ...input.payments.map((payment) => ({
      id: `payment-created-${payment.id}`,
      action: "payment_recorded",
      actorUserId: payment.createdByUserId,
      targetType: "payment",
      targetId: payment.id,
      createdAt: payment.createdAt,
    })),
  ] satisfies UserActivityEvent[];
}

export function activityTitle(action: string) {
  const label = action.replaceAll("_", " ").trim();
  return label ? label.charAt(0).toUpperCase() + label.slice(1) : "Activity";
}

export function activityActorLabel(
  actorUserId: string | null,
  currentUserId: string | null,
  profiles: UserProfile[],
  sharedGroupMembers: SharedGroupMember[],
) {
  if (!actorUserId) return "System";
  if (actorUserId === currentUserId) return "You";
  return (
    profiles.find((profile) => profile.id === actorUserId)?.displayName ??
    sharedGroupMembers.find((member) => member.linkedUserId === actorUserId)
      ?.displayName ??
    "Another participant"
  );
}

export function activityCategory(targetType: string) {
  if (targetType.includes("payment") || targetType.includes("settlement"))
    return "payments";
  if (targetType.includes("group") || targetType.includes("expense"))
    return "groups";
  if (targetType.includes("debt")) return "debts";
  return "account";
}
