import type {
  AppSettings,
  Attachment,
  Comment,
  Debt,
  Event,
  EventDebt,
  EventParticipant,
  SharedExpense,
} from '@/src/types/models';
import {
  canArchiveEvent,
  canEditEvent,
  canEditExpense,
  canInviteMembers,
  canManageRoles,
  canMergeEventMembers,
  participantForUser,
} from '@/src/services/eventPermissions';

export type PermissionContext = {
  userId?: string | null;
  settings: AppSettings;
  events: Event[];
  eventParticipants: EventParticipant[];
};

export function canViewRecord(record: Record<string, unknown>, context: PermissionContext) {
  const visibility = record.visibility;
  if (!visibility || visibility === 'private') {
    return true;
  }
  const event = eventForRecord(record, context.events);
  if (!event) {
    return Boolean(context.userId);
  }
  return Boolean(participantForUser(event, context.eventParticipants, context.userId)) || event.ownerUserId === context.userId;
}

export function canEditRecord(record: Debt | SharedExpense | EventDebt | Event, context: PermissionContext) {
  if ('visibility' in record && record.visibility === 'private') {
    return !isProtectedFinancialRecord(record);
  }
  if ('defaultCurrency' in record) {
    return canEditEvent({
      event: record,
      participant: participantForUser(record, context.eventParticipants, context.userId),
      userId: context.userId,
    });
  }
  const event = eventForRecord(record, context.events);
  if (!event) {
    return false;
  }
  if ('type' in record && record.type === 'simple') {
    return false;
  }
  return canEditExpense(
    {
      event,
      participant: participantForUser(event, context.eventParticipants, context.userId),
      userId: context.userId,
    },
    record as SharedExpense | EventDebt,
  );
}

export function canArchiveRecord(record: Debt | SharedExpense | EventDebt | Event, context: PermissionContext) {
  if ('defaultCurrency' in record) {
    return canArchiveEvent({
      event: record,
      participant: participantForUser(record, context.eventParticipants, context.userId),
      userId: context.userId,
    });
  }
  return canEditRecord(record, context);
}

export function canVoidFinancialRecord(record: Debt | SharedExpense | EventDebt, context: PermissionContext) {
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

export function canManageEvent(event: Event, context: PermissionContext) {
  return canEditEvent({
    event,
    participant: participantForUser(event, context.eventParticipants, context.userId),
    userId: context.userId,
  });
}

export function canManageParticipants(event: Event, context: PermissionContext) {
  return canInviteMembers({
    event,
    participant: participantForUser(event, context.eventParticipants, context.userId),
    userId: context.userId,
  });
}

export function canManageAdvancedRoles(event: Event, context: PermissionContext) {
  return canManageRoles({
    event,
    participant: participantForUser(event, context.eventParticipants, context.userId),
    userId: context.userId,
  });
}

export function canResolveConflict(context: PermissionContext) {
  return Boolean(context.userId);
}

export function canMergeDuplicateMembers(event: Event, context: PermissionContext) {
  return canMergeEventMembers({
    event,
    participant: participantForUser(event, context.eventParticipants, context.userId),
    userId: context.userId,
  });
}

export function canRestoreBackupToSharedRecord(record: Record<string, unknown>, context: PermissionContext) {
  return isSharedRecord(record) && Boolean(context.userId) && canViewRecord(record, context);
}

function eventForRecord(record: Record<string, unknown>, events: Event[]) {
  const eventId = typeof record.eventId === 'string' ? record.eventId : null;
  return eventId ? events.find((event) => event.id === eventId) ?? null : null;
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
    record.visibility === 'shared_event' ||
    record.visibility === 'shared_with_involved_member'
  );
}
