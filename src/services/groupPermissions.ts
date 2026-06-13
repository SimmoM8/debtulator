import type {
  Group,
  GroupDebt,
  GroupParticipant,
  GroupRole,
  SharedExpense,
} from '@/src/types/models';

export type GroupPermissionContext = {
  group: Group;
  participant?: GroupParticipant | null;
  userId?: string | null;
};

const ROLE_RANK: Record<GroupRole, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3,
};

export function participantForUser(
  group: Group,
  participants: GroupParticipant[],
  userId?: string | null,
) {
  if (!userId) {
    return null;
  }
  return (
    participants.find(
      (participant) =>
        participant.groupId === group.id &&
        participant.userId === userId &&
        participant.status === 'active',
    ) ?? null
  );
}

export function roleForGroup(context: GroupPermissionContext): GroupRole {
  if (context.group.visibility === 'private') {
    return 'owner';
  }
  if (context.group.ownerUserId && context.userId === context.group.ownerUserId) {
    return 'owner';
  }
  return context.participant?.role ?? 'viewer';
}

export function roleAtLeast(role: GroupRole, minimum: GroupRole) {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export function isReadOnlyGroup(group: Group) {
  return Boolean(group.archived || group.archivedAt || group.status === 'archived' || group.status === 'settled');
}

export function isLockedGroup(group: Group) {
  return Boolean(group.lockedAt || group.finalisedAt || group.status === 'finalising' || isReadOnlyGroup(group));
}

export function canEditGroup(context: GroupPermissionContext) {
  const role = roleForGroup(context);
  return !isReadOnlyGroup(context.group) && roleAtLeast(role, 'admin');
}

export function canInviteMembers(context: GroupPermissionContext) {
  return context.group.visibility === 'shared' && !isReadOnlyGroup(context.group) && roleAtLeast(roleForGroup(context), 'admin');
}

export function canManageRoles(context: GroupPermissionContext) {
  return context.group.visibility === 'shared' && !isReadOnlyGroup(context.group) && roleForGroup(context) === 'owner';
}

export function canAddExpense(context: GroupPermissionContext) {
  const role = roleForGroup(context);
  return !isLockedGroup(context.group) && roleAtLeast(role, 'member');
}

export function canEditExpense(context: GroupPermissionContext, expense?: SharedExpense | GroupDebt | null) {
  const role = roleForGroup(context);
  if (isLockedGroup(context.group)) {
    return false;
  }
  if (roleAtLeast(role, 'admin')) {
    return true;
  }
  return role === 'member' && Boolean(expense?.creatorUserId && expense.creatorUserId === context.userId);
}

export function canDeleteExpense(context: GroupPermissionContext, expense?: SharedExpense | GroupDebt | null) {
  return canEditExpense(context, expense);
}

export function canVerifyExpense(context: GroupPermissionContext) {
  const role = roleForGroup(context);
  return !isReadOnlyGroup(context.group) && roleAtLeast(role, 'member');
}

export function canRejectExpense(context: GroupPermissionContext) {
  return canVerifyExpense(context);
}

export function canMergeGroupMembers(context: GroupPermissionContext) {
  return context.group.visibility === 'shared' && !isReadOnlyGroup(context.group) && roleAtLeast(roleForGroup(context), 'admin');
}

export function canFinaliseGroup(context: GroupPermissionContext) {
  return !isReadOnlyGroup(context.group) && roleAtLeast(roleForGroup(context), 'admin');
}

export function canArchiveGroup(context: GroupPermissionContext) {
  return roleAtLeast(roleForGroup(context), 'admin');
}

export function canReopenGroup(context: GroupPermissionContext) {
  return context.group.visibility === 'shared'
    ? roleAtLeast(roleForGroup(context), 'admin') && !context.group.archived
    : roleForGroup(context) === 'owner';
}
