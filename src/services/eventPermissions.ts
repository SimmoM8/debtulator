import type {
  Event,
  EventDebt,
  EventParticipant,
  EventRole,
  SharedExpense,
} from '@/src/types/models';

export type EventPermissionContext = {
  event: Event;
  participant?: EventParticipant | null;
  userId?: string | null;
};

const ROLE_RANK: Record<EventRole, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3,
};

export function participantForUser(
  event: Event,
  participants: EventParticipant[],
  userId?: string | null,
) {
  if (!userId) {
    return null;
  }
  return (
    participants.find(
      (participant) =>
        participant.eventId === event.id &&
        participant.userId === userId &&
        participant.status === 'active',
    ) ?? null
  );
}

export function roleForEvent(context: EventPermissionContext): EventRole {
  if (context.event.visibility === 'private') {
    return 'owner';
  }
  if (context.event.ownerUserId && context.userId === context.event.ownerUserId) {
    return 'owner';
  }
  return context.participant?.role ?? 'viewer';
}

export function roleAtLeast(role: EventRole, minimum: EventRole) {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export function isReadOnlyEvent(event: Event) {
  return Boolean(event.archived || event.archivedAt || event.status === 'archived' || event.status === 'settled');
}

export function isLockedEvent(event: Event) {
  return Boolean(event.lockedAt || event.finalisedAt || event.status === 'finalising' || isReadOnlyEvent(event));
}

export function canEditEvent(context: EventPermissionContext) {
  const role = roleForEvent(context);
  return !isReadOnlyEvent(context.event) && roleAtLeast(role, 'admin');
}

export function canInviteMembers(context: EventPermissionContext) {
  return context.event.visibility === 'shared' && !isReadOnlyEvent(context.event) && roleAtLeast(roleForEvent(context), 'admin');
}

export function canManageRoles(context: EventPermissionContext) {
  return context.event.visibility === 'shared' && !isReadOnlyEvent(context.event) && roleForEvent(context) === 'owner';
}

export function canAddExpense(context: EventPermissionContext) {
  const role = roleForEvent(context);
  return !isLockedEvent(context.event) && roleAtLeast(role, 'member');
}

export function canEditExpense(context: EventPermissionContext, expense?: SharedExpense | EventDebt | null) {
  const role = roleForEvent(context);
  if (isLockedEvent(context.event)) {
    return false;
  }
  if (roleAtLeast(role, 'admin')) {
    return true;
  }
  return role === 'member' && Boolean(expense?.creatorUserId && expense.creatorUserId === context.userId);
}

export function canDeleteExpense(context: EventPermissionContext, expense?: SharedExpense | EventDebt | null) {
  return canEditExpense(context, expense);
}

export function canVerifyExpense(context: EventPermissionContext) {
  const role = roleForEvent(context);
  return !isReadOnlyEvent(context.event) && roleAtLeast(role, 'member');
}

export function canRejectExpense(context: EventPermissionContext) {
  return canVerifyExpense(context);
}

export function canMergeEventMembers(context: EventPermissionContext) {
  return context.event.visibility === 'shared' && !isReadOnlyEvent(context.event) && roleAtLeast(roleForEvent(context), 'admin');
}

export function canFinaliseEvent(context: EventPermissionContext) {
  return !isReadOnlyEvent(context.event) && roleAtLeast(roleForEvent(context), 'admin');
}

export function canArchiveEvent(context: EventPermissionContext) {
  return roleAtLeast(roleForEvent(context), 'admin');
}

export function canReopenEvent(context: EventPermissionContext) {
  return context.event.visibility === 'shared'
    ? roleAtLeast(roleForEvent(context), 'admin') && !context.event.archived
    : roleForEvent(context) === 'owner';
}
