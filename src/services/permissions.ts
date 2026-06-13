import type {
  AppSettings,
  Attachment,
  Comment,
  Debt,
  Group,
  GroupDebt,
  GroupParticipant,
  SharedExpense,
} from '@/src/types/models';
import {
  canArchiveGroup,
  canEditGroup,
  canEditExpense,
  canInviteMembers,
  canManageRoles,
  canMergeGroupMembers,
  participantForUser,
} from '@/src/services/groupPermissions';

export type PermissionContext = {
  userId?: string | null;
  settings: AppSettings;
  groups: Group[];
  groupParticipants: GroupParticipant[];
};

export function canViewRecord(record: Record<string, unknown>, context: PermissionContext) {
  const visibility = record.visibility;
  if (!visibility || visibility === 'private') {
    return true;
  }
  const group = groupForRecord(record, context.groups);
  if (!group) {
    return Boolean(context.userId);
  }
  return Boolean(participantForUser(group, context.groupParticipants, context.userId)) || group.ownerUserId === context.userId;
}

export function canEditRecord(record: Debt | SharedExpense | GroupDebt | Group, context: PermissionContext) {
  if ('visibility' in record && record.visibility === 'private') {
    return !isProtectedFinancialRecord(record);
  }
  if ('defaultCurrency' in record) {
    return canEditGroup({
      group: record,
      participant: participantForUser(record, context.groupParticipants, context.userId),
      userId: context.userId,
    });
  }
  const group = groupForRecord(record, context.groups);
  if (!group) {
    return false;
  }
  if ('type' in record && record.type === 'simple') {
    return false;
  }
  return canEditExpense(
    {
      group,
      participant: participantForUser(group, context.groupParticipants, context.userId),
      userId: context.userId,
    },
    record as SharedExpense | GroupDebt,
  );
}

export function canArchiveRecord(record: Debt | SharedExpense | GroupDebt | Group, context: PermissionContext) {
  if ('defaultCurrency' in record) {
    return canArchiveGroup({
      group: record,
      participant: participantForUser(record, context.groupParticipants, context.userId),
      userId: context.userId,
    });
  }
  return canEditRecord(record, context);
}

export function canVoidFinancialRecord(record: Debt | SharedExpense | GroupDebt, context: PermissionContext) {
  return canEditRecord(record, context) && isProtectedFinancialRecord(record);
}

export function canExportRecord(record: Record<string, unknown>, context: PermissionContext) {
  return canViewRecord(record, context);
}

export function canAddAttachment(record: Record<string, unknown>, context: PermissionContext) {
  return canViewRecord(record, context) && (!isSharedRecord(record) || Boolean(context.userId));
}

export function canViewAttachment(attachment: Attachment, context: PermissionContext) {
  if (attachment.visibility === 'private') {
    return true;
  }
  return canViewRecord(attachment, context);
}

export function canAddComment(record: Record<string, unknown>, context: PermissionContext) {
  return canAddAttachment(record, context);
}

export function canViewComment(comment: Comment, context: PermissionContext) {
  if (comment.visibility === 'private') {
    return true;
  }
  return canViewRecord(comment, context);
}

export function canManageGroup(group: Group, context: PermissionContext) {
  return canEditGroup({
    group,
    participant: participantForUser(group, context.groupParticipants, context.userId),
    userId: context.userId,
  });
}

export function canManageParticipants(group: Group, context: PermissionContext) {
  return canInviteMembers({
    group,
    participant: participantForUser(group, context.groupParticipants, context.userId),
    userId: context.userId,
  });
}

export function canManageAdvancedRoles(group: Group, context: PermissionContext) {
  return canManageRoles({
    group,
    participant: participantForUser(group, context.groupParticipants, context.userId),
    userId: context.userId,
  });
}

export function canResolveConflict(context: PermissionContext) {
  return Boolean(context.userId);
}

export function canMergeDuplicateMembers(group: Group, context: PermissionContext) {
  return canMergeGroupMembers({
    group,
    participant: participantForUser(group, context.groupParticipants, context.userId),
    userId: context.userId,
  });
}

export function canRestoreBackupToSharedRecord(record: Record<string, unknown>, context: PermissionContext) {
  return isSharedRecord(record) && Boolean(context.userId) && canViewRecord(record, context);
}

function groupForRecord(record: Record<string, unknown>, groups: Group[]) {
  const groupId = typeof record.groupId === 'string' ? record.groupId : null;
  return groupId ? groups.find((group) => group.id === groupId) ?? null : null;
}

function isProtectedFinancialRecord(record: Record<string, unknown>) {
  return (
    record.verificationStatus === 'verified' ||
    record.status === 'settled' ||
    record.status === 'confirmed' ||
    record.confirmationStatus === 'confirmed'
  );
}

function isSharedRecord(record: Record<string, unknown>) {
  return (
    record.visibility === 'shared' ||
    record.visibility === 'shared_group' ||
    record.visibility === 'shared_with_involved_member'
  );
}
