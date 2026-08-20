import { formatMoney } from '@debtulator/domain/finance/money';
import type {
  ActivityLog,
  CurrencyCode,
  Debt,
  DebtChangeSummary,
  DebtVerification,
  VerificationStatus,
} from '@debtulator/domain/models';

type ConfirmationField = NonNullable<
  DebtVerification['changeSummary']
>['changedFields'][number];
type PendingConfirmationStatus = Extract<
  VerificationStatus,
  'pending' | 'rejected'
>;

export function formatDate(input: string) {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return input;
  }
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDueRelative(input: string) {
  const datePart = input.slice(0, 10);
  const [year, month, day] = datePart.split('-').map(Number);
  const dueDate = new Date(year, month - 1, day);

  if (
    !year ||
    !month ||
    !day ||
    Number.isNaN(dueDate.getTime()) ||
    dueDate.getFullYear() !== year ||
    dueDate.getMonth() !== month - 1 ||
    dueDate.getDate() !== day
  ) {
    return 'Due date set';
  }

  const today = new Date();
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const days = Math.round(
    (dueDate.getTime() - todayStart.getTime()) / 86_400_000,
  );

  if (days === 0) {
    return 'Due today';
  }
  if (days === 1) {
    return '1 day remaining';
  }
  if (days > 1) {
    return `${days} days remaining`;
  }
  if (days === -1) {
    return '1 day overdue';
  }
  return `${Math.abs(days)} days overdue`;
}

export function describeDebtActivity(
  action: string,
  metadata: Record<string, unknown>,
  fallbackCurrency: CurrencyCode,
) {
  const nextValue = metadata.nextValue;
  const previousValue = metadata.previousValue;
  const addedTags = stringArray(metadata.addedTags);
  const removedTags = stringArray(metadata.removedTags);

  switch (action) {
    case 'debt_due_date_added':
      return {
        phrase: 'added a due date',
        detail: typeof nextValue === 'string' ? formatDate(nextValue) : '',
      };
    case 'debt_due_date_changed':
      return {
        phrase: 'changed the due date',
        detail:
          typeof previousValue === 'string' && typeof nextValue === 'string'
            ? `${formatDate(previousValue)} → ${formatDate(nextValue)}`
            : '',
      };
    case 'debt_due_date_removed':
      return { phrase: 'removed the due date', detail: '' };
    case 'debt_tag_added':
      return {
        phrase:
          addedTags.length && removedTags.length
            ? 'updated tags'
            : addedTags.length === 1
              ? 'added a tag'
              : addedTags.length > 1
                ? 'added tags'
                : removedTags.length === 1
                  ? 'removed a tag'
                  : 'removed tags',
        detail: [
          addedTags.length ? `Added ${addedTags.join(', ')}` : '',
          removedTags.length ? `Removed ${removedTags.join(', ')}` : '',
        ]
          .filter(Boolean)
          .join(' · '),
      };
    case 'debt_notes_added':
      return { phrase: 'added notes', detail: '' };
    case 'debt_notes_updated':
      return { phrase: 'updated the notes', detail: '' };
    case 'debt_notes_removed':
      return { phrase: 'removed the notes', detail: '' };
    case 'debt_shared_notes_added':
      return { phrase: 'added shared notes', detail: '' };
    case 'debt_shared_notes_updated':
      return { phrase: 'updated the shared notes', detail: '' };
    case 'debt_shared_notes_removed':
      return { phrase: 'removed the shared notes', detail: '' };
    case 'debt_title_changed':
      return {
        phrase: 'changed the title',
        detail: typeof nextValue === 'string' ? nextValue : '',
      };
    case 'debt_amount_changed': {
      const currency =
        typeof metadata.currency === 'string'
          ? (metadata.currency as CurrencyCode)
          : fallbackCurrency;
      return {
        phrase: 'changed the amount',
        detail:
          typeof previousValue === 'number' && typeof nextValue === 'number'
            ? `${formatMoney(previousValue, currency)} -> ${formatMoney(nextValue, currency)}`
            : typeof nextValue === 'number'
              ? formatMoney(nextValue, currency)
              : '',
      };
    }
    case 'debt_currency_changed':
      return {
        phrase: 'changed the currency',
        detail: typeof nextValue === 'string' ? nextValue : '',
      };
    case 'debt_member_changed':
      return { phrase: 'changed the member', detail: '' };
    case 'debt_direction_changed':
      return { phrase: 'changed who owes whom', detail: '' };
    case 'debt_date_changed':
      return {
        phrase: 'changed the debt date',
        detail: typeof nextValue === 'string' ? formatDate(nextValue) : '',
      };
    case 'debt_group_added':
      return { phrase: 'added the debt to an group', detail: '' };
    case 'debt_group_removed':
      return { phrase: 'removed the debt from its group', detail: '' };
    case 'debt_archived':
      return { phrase: 'archived the debt', detail: '' };
    case 'debt_settled':
      return { phrase: 'settled the debt', detail: '' };
    case 'debt_reopened':
      return { phrase: 'reopened the debt', detail: '' };
    case 'debt_verification_requested':
      return { phrase: 'requested verification', detail: '' };
    case 'debt_verified':
      return { phrase: 'verified the debt', detail: '' };
    case 'debt_rejected':
      return { phrase: 'rejected the debt', detail: '' };
    case 'debt_marked_disputed':
      return { phrase: 'marked the debt as disputed', detail: '' };
    case 'debt_resolved':
      return { phrase: 'resolved the dispute', detail: '' };
    case 'debt_verification_cancelled':
      return { phrase: 'cancelled verification', detail: '' };
    case 'verification_reset_financial_edit':
      return {
        phrase: 'changed financial details',
        detail: 'Verification is required again',
      };
    case 'debt_edited':
      return { phrase: 'updated debt details', detail: '' };
    default:
      return {
        phrase: action.replace(/^debt_/, '').replaceAll('_', ' '),
        detail: '',
      };
  }
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

export function buildChangeSummaryFromActivities(
  activities: ActivityLog[],
): DebtChangeSummary {
  const changedFields: DebtChangeSummary['changedFields'] = [];
  const previous: DebtChangeSummary['previous'] = {};
  const proposed: DebtChangeSummary['proposed'] = {};
  const ordered = [...activities].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );

  for (const activity of ordered) {
    const field = activityConfirmationField(activity.action);
    if (field === 'none' || field === 'debt') {
      continue;
    }
    if (!changedFields.includes(field)) {
      changedFields.push(field);
      previous[field] = confirmationChangeValue(
        activity.metadata.previousValue,
      );
    }
    proposed[field] = confirmationChangeValue(activity.metadata.nextValue);
  }

  return { changedFields, previous, proposed };
}

function confirmationChangeValue(value: unknown) {
  return typeof value === 'string' ||
    typeof value === 'number' ||
    value === null
    ? value
    : null;
}

export function getCurrentConfirmations(verifications: DebtVerification[]) {
  const ordered = [...verifications]
    .filter(
      (verification) =>
        (verification.status === 'pending' ||
          verification.status === 'rejected') &&
        (verification.requestType === 'creation' ||
          verification.changeSummary?.changedFields.some((field) =>
            ['amount', 'direction', 'dueDate', 'title', 'member', 'status'].includes(field),
          )),
    )
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  const claimedKeys = new Set<string>();
  const selected = new Map<string, DebtVerification>();

  for (const verification of ordered) {
    const keys =
      verification.requestType === 'creation'
        ? ['debt']
        : verification.changeSummary?.changedFields.length
          ? verification.changeSummary.changedFields
          : [`request:${verification.id}`];
    const unclaimedKeys = keys.filter((key) => !claimedKeys.has(key));
    if (!unclaimedKeys.length) {
      continue;
    }
    unclaimedKeys.forEach((key) => claimedKeys.add(key));
    selected.set(verification.id, verification);
  }

  return Array.from(selected.values()).sort((a, b) =>
    b.requestedAt.localeCompare(a.requestedAt),
  );
}

export function confirmationItemTitle(verification: DebtVerification) {
  if (verification.requestType === 'creation') {
    return 'Debt';
  }
  const labels = verification.changeSummary?.changedFields.map(
    confirmationFieldLabel,
  );
  return labels?.length ? labels.join(', ') : 'Debt changes';
}

export function confirmationDescription(
  verification: DebtVerification,
  debt: Debt,
) {
  if (verification.requestType === 'creation') {
    return `${formatMoney(debt.amount, debt.currency)} · ${debt.title}`;
  }
  const summary = verification.changeSummary;
  if (!summary) {
    return 'Review the proposed debt changes.';
  }
  return summary.changedFields
    .map((field) => {
      const previous = formatConfirmationValue(
        field,
        summary.previous[field],
        debt.currency,
      );
      const proposed = formatConfirmationValue(
        field,
        summary.proposed[field],
        debt.currency,
      );
      return `${confirmationFieldLabel(field)}: ${previous} → ${proposed}`;
    })
    .join('\n');
}

export function confirmationFieldLabel(field: ConfirmationField) {
  switch (field) {
    case 'dueDate':
      return 'Due date';
    case 'direction':
      return 'Who owes whom';
    case 'member':
      return 'Member';
    case 'amount':
      return 'Amount';
    case 'title':
      return 'Title';
    case 'status':
      return 'Status';
  }
}

function formatConfirmationValue(
  field: ConfirmationField,
  value: string | number | null | undefined,
  currency: CurrencyCode,
) {
  if (value === null || value === undefined || value === '') {
    return 'Not set';
  }
  if (field === 'amount' && typeof value === 'number') {
    return formatMoney(value, currency);
  }
  if (field === 'dueDate' && typeof value === 'string') {
    return formatDate(value);
  }
  if (field === 'direction') {
    return value === 'they_owe_me' ? 'They owe you' : 'You owe them';
  }
  return String(value);
}

export function confirmationStateForActivity(
  action: string,
  createdAt: string,
  confirmations: DebtVerification[],
): PendingConfirmationStatus | undefined {
  const field = activityConfirmationField(action);
  if (field === 'none') {
    return undefined;
  }
  const activityTime = new Date(createdAt).getTime();
  const match = confirmations.find((verification) => {
    if (
      verification.status !== 'pending' &&
      verification.status !== 'rejected'
    ) {
      return false;
    }
    if (field === 'debt') {
      return verification.requestType === 'creation';
    }
    if (!verification.changeSummary?.changedFields.includes(field)) {
      return false;
    }
    const requestTime = new Date(verification.requestedAt).getTime();
    return (
      Number.isFinite(activityTime) &&
      Number.isFinite(requestTime) &&
      requestTime >= activityTime &&
      requestTime - activityTime < 5 * 60 * 1000
    );
  });
  return match?.status === 'pending' || match?.status === 'rejected'
    ? match.status
    : undefined;
}

export function confirmationStatusForField(
  field: 'amount' | 'direction' | 'dueDate',
  confirmations: DebtVerification[],
): PendingConfirmationStatus | undefined {
  const match = confirmations.find(
    (verification) =>
      verification.changeSummary?.changedFields.includes(field) &&
      (verification.status === 'pending' ||
        verification.status === 'rejected'),
  );
  return match?.status === 'pending' || match?.status === 'rejected'
    ? match.status
    : undefined;
}

export function activityConfirmationField(action: string) {
  switch (action) {
    case 'debt_created':
      return 'debt' as const;
    case 'debt_amount_changed':
      return 'amount' as const;
    case 'debt_direction_changed':
      return 'direction' as const;
    case 'debt_title_changed':
      return 'title' as const;
    case 'debt_member_changed':
      return 'member' as const;
    case 'debt_archived':
    case 'debt_reopened':
    case 'debt_status_changed':
      return 'status' as const;
    case 'debt_due_date_added':
    case 'debt_due_date_changed':
    case 'debt_due_date_removed':
      return 'dueDate' as const;
    default:
      return 'none' as const;
  }
}
