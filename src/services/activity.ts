import type {
  ActivityLog,
  AuditLog,
  Debt,
  DebtVerification,
  GroupActivityLog,
  Group,
  GroupDebt,
  LinkRequest,
  Member,
  Payment,
  SettlementLine,
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
  metadata: Record<string, unknown>;
};

export function buildUserActivity(input: {
  activityLogs: ActivityLog[];
  auditLogs: AuditLog[];
  groupActivityLogs: GroupActivityLog[];
  linkRequests: LinkRequest[];
  debts: Debt[];
  debtVerifications: DebtVerification[];
  groupDebts: GroupDebt[];
  payments: Payment[];
  sharedExpenses: SharedExpense[];
  currentUserId: string | null;
}) {
  return [
    ...input.activityLogs
      .filter((activity) => activity.action !== "debt_verification_requested")
      .map((activity) => ({
        id: `activity-${activity.id}`,
        action: activity.action,
        actorUserId: activity.actorUserId,
        targetType: activity.entityKind,
        targetId: activity.entityId,
        createdAt: activity.createdAt,
        metadata: {
          ...activity.metadata,
          ...(activity.entityKind === "link_request"
            ? {
                status: input.linkRequests.find(
                  (request) => request.id === activity.entityId,
                )?.status,
              }
            : {}),
          ...(activity.entityKind === "debt"
            ? {
                verificationStatus: debtActivityVerificationStatus(
                  activity,
                  input.debtVerifications,
                ),
              }
            : {}),
        },
      })),
    ...input.groupActivityLogs.map((activity) => ({
      id: `group-activity-${activity.id}`,
      action: activity.action,
      actorUserId: activity.actorUserId,
      targetType: activity.targetType,
      targetId: activity.targetId ?? activity.groupId,
      createdAt: activity.createdAt,
      metadata: activity.metadata,
    })),
    ...input.auditLogs.map((activity) => ({
      id: `audit-${activity.id}`,
      action: activity.action,
      actorUserId: activity.actorUserId,
      targetType: activity.targetType,
      targetId: activity.targetId,
      createdAt: activity.createdAt,
      metadata: activity.metadata,
    })),
    ...input.debts
      .filter(
        (debt) =>
          !input.debtVerifications.some(
            (verification) =>
              verification.debtId === debt.id &&
              verification.requestType === "creation" &&
              verification.status === "pending" &&
              verification.responderUserId === input.currentUserId,
          ),
      )
      .map((debt) => ({
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
      metadata: {
        title: debt.title,
        amount: debt.amount,
        currency: debt.currency,
        memberId: debt.memberId,
        direction: debt.direction,
        verificationStatus:
          input.debtVerifications
            .filter(
              (verification) =>
                verification.debtId === debt.id &&
                verification.requestType === "creation",
            )
            .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))[0]
            ?.status ?? debt.verificationStatus,
      },
      })),
    ...input.sharedExpenses.map((expense) => ({
      id: `expense-created-${expense.id}`,
      action: "shared_expense_created",
      actorUserId: expense.creatorUserId,
      targetType: "shared_expense",
      targetId: expense.id,
      createdAt: expense.createdAt,
      metadata: {
        title: expense.title,
        amount: expense.amount,
        currency: expense.currency,
        verificationStatus: expense.verificationStatus,
      },
    })),
    ...input.groupDebts.map((debt) => ({
      id: `group-debt-created-${debt.id}`,
      action: "group_debt_created",
      actorUserId: debt.creatorUserId,
      targetType: "group_debt",
      targetId: debt.id,
      createdAt: debt.createdAt,
      metadata: {
        title: debt.title,
        amount: debt.amount,
        currency: debt.currency,
        verificationStatus: debt.verificationStatus,
      },
    })),
    ...input.payments.map((payment) => ({
      id: `payment-created-${payment.id}`,
      action: "payment_recorded",
      actorUserId: payment.createdByUserId,
      targetType: "payment",
      targetId: payment.id,
      createdAt: payment.createdAt,
      metadata: {
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        confirmationStatus: payment.confirmationStatus,
        relatedMemberId: payment.relatedMemberId,
        groupId: payment.groupId,
        payerMemberId: payment.payerMemberId,
        payeeMemberId: payment.payeeMemberId,
        payerGroupMemberId: payment.payerGroupMemberId,
        payeeGroupMemberId: payment.payeeGroupMemberId,
      },
    })),
  ] satisfies UserActivityEvent[];
}

export function activityTitle(action: string) {
  const label = action.replaceAll("_", " ").trim();
  return label ? label.charAt(0).toUpperCase() + label.slice(1) : "Activity";
}

export function activitySentence(actor: string, action: string) {
  const possessive = actor === "You" ? "your" : "their";
  const phrases: Record<string, string> = {
    debt_created: "created a debt",
    payment_recorded: "made a payment",
    shared_expense_created: "created a shared expense",
    group_debt_created: "created a group debt",
    group_created: "created a group",
    group_edited: "updated a group",
    expense_added: "added an expense",
    expense_edited: "updated an expense",
    invite_sent: "sent a group invitation",
    invite_accepted: "accepted a group invitation",
    invite_rejected: "declined a group invitation",
    invite_cancelled: "cancelled a group invitation",
    group_member_added: "added a member",
    group_member_edited: "updated a member",
    unlinked_member_claim_requested: "claimed a member",
    claim_approved: "approved a claim",
    claim_rejected: "rejected a claim",
    claim_cancelled: "cancelled a claim",
    duplicate_warning_ignored: "dismissed a duplicate warning",
    members_merged: "merged members",
    simple_debt_added: "added a group debt",
    simple_debt_edited: "updated a group debt",
    expense_verified: "verified an expense",
    expense_rejected: "rejected an expense",
    attachment_added: "added an attachment",
    attachment_removed: "removed an attachment",
    comment_added: "added a comment",
    comment_edited: "edited a comment",
    comment_deleted: "deleted a comment",
    export_generated: "generated an export",
    backup_exported: "exported a backup",
    restore_performed: "restored a backup",
    import_completed: "completed an import",
    conflict_resolved: "resolved a sync conflict",
    account_deletion_requested: `requested to delete ${possessive} account`,
    account_deletion_failed: `couldn’t delete ${possessive} account`,
    account_deletion_completed: `deleted ${possessive} account`,
    profile_updated: `updated ${possessive} profile`,
    member_link_request_sent: "sent a link request",
    member_link_accepted: "accepted a link request",
    member_link_rejected: "rejected a link request",
    member_link_cancelled: "cancelled a link request",
    member_link_expired: "let a link request expire",
    member_unlinked: "unlinked a member",
    debt_due_date_added: "added a due date",
    debt_due_date_changed: "changed the due date",
    debt_due_date_removed: "removed the due date",
    debt_title_changed: "changed a title",
    debt_amount_changed: "changed an amount",
    debt_currency_changed: "changed a currency",
    debt_notes_added: "added notes",
    debt_notes_updated: "updated notes",
    debt_notes_removed: "removed notes",
    debt_shared_notes_added: "added shared notes",
    debt_shared_notes_updated: "updated shared notes",
    debt_shared_notes_removed: "removed shared notes",
    debt_tag_added: "added a tag",
    debt_tag_removed: "removed a tag",
    debt_tags_updated: "updated tags",
    debt_member_changed: "changed a debt member",
    debt_direction_changed: "changed who owes whom",
    debt_group_added: "added a debt to a group",
    debt_group_removed: "removed a debt from a group",
    debt_archived: "archived a debt",
    debt_reopened: "reopened a debt",
    debt_verification_requested: "requested confirmation",
    debt_verification_cancelled: "cancelled confirmation",
    debt_verified: "verified a debt",
    debt_rejected: "rejected a debt",
    debt_marked_disputed: "marked a debt as disputed",
    debt_resolved: "resolved a debt dispute",
    verification_reset_financial_edit: "changed a confirmed debt",
    payment_confirmed: "confirmed a payment",
    payment_rejected: "rejected a payment",
    payment_cancelled: "cancelled a payment",
    payment_archived: "archived a payment",
    settlement_record_created: "settled a debt",
    recurring_template_created: "created a recurring debt",
    recurring_template_edited: "updated a recurring debt",
    recurring_template_paused: "paused a recurring debt",
    recurring_template_ended: "ended a recurring debt",
    recurring_record_generated: "created a scheduled debt",
    reminder_scheduled: "scheduled a reminder",
    reminder_sent: "sent a reminder",
    smart_suggestion_accepted: "accepted a smart suggestion",
    smart_suggestion_dismissed: "dismissed a smart suggestion",
    smart_suggestion_expired: "had a smart suggestion expire",
    beta_breadcrumb: "recorded a diagnostic breadcrumb",
    beta_event: "recorded a diagnostic event",
    beta_crash: "recorded a crash report",
  };
  const phrase = phrases[action] ?? fallbackActivityPhrase(action);
  return `${actor} ${phrase}`;
}

export function activityEventSentence(
  event: UserActivityEvent,
  context: {
    currentUserId: string | null;
    profiles: UserProfile[];
    sharedGroupMembers: SharedGroupMember[];
    members: Member[];
  },
) {
  const actor = activityActorLabel(
    event.actorUserId,
    context.currentUserId,
    context.profiles,
    context.sharedGroupMembers,
    context.members,
  );

  if (event.action === "reminder_sent") {
    return `${actor} reminded ${reminderRecipientLabel(event, context)}`;
  }

  return activitySentence(actor, event.action);
}

function fallbackActivityPhrase(action: string) {
  const words = action.split("_").filter(Boolean);
  const pastTenseIndex = words.findIndex((word) =>
    /(?:ed|sent|made|paid|left|merged|resolved|created|updated)$/.test(word),
  );
  if (pastTenseIndex > 0) {
    return [
      ...words.slice(pastTenseIndex),
      ...words.slice(0, pastTenseIndex),
    ].join(" ");
  }
  return words.join(" ") || "performed an activity";
}

function reminderRecipientLabel(
  event: UserActivityEvent,
  context: {
    currentUserId: string | null;
    profiles: UserProfile[];
    sharedGroupMembers: SharedGroupMember[];
    members: Member[];
  },
) {
  const recipientUserId = stringValue(event.metadata.recipientUserId);
  if (recipientUserId) {
    return activityActorLabel(
      recipientUserId,
      context.currentUserId,
      context.profiles,
      context.sharedGroupMembers,
      context.members,
    );
  }

  const relatedMemberId = stringValue(event.metadata.relatedMemberId);
  const memberName = context.members.find(
    (member) => member.id === relatedMemberId,
  )?.displayName;

  return firstName(memberName) || "someone";
}

export function activityActorLabel(
  actorUserId: string | null,
  currentUserId: string | null,
  profiles: UserProfile[],
  sharedGroupMembers: SharedGroupMember[],
  members: Member[],
) {
  if (!actorUserId) return "System";
  if (actorUserId === currentUserId) return "You";
  const displayName =
    profiles.find((profile) => profile.id === actorUserId)?.displayName ??
    sharedGroupMembers.find((member) => member.linkedUserId === actorUserId)
      ?.displayName ??
    members.find((member) => member.linkedUserId === actorUserId)?.displayName;
  return displayName?.trim().split(/\s+/)[0] || "Someone";
}

export function activityCategory(targetType: string) {
  if (targetType.includes("payment") || targetType.includes("settlement"))
    return "payments";
  if (targetType.includes("group") || targetType.includes("expense"))
    return "groups";
  if (targetType.includes("debt")) return "debts";
  return "account";
}

export function activityDetailRows(event: UserActivityEvent) {
  const rows = [
    { label: "Event", value: activityTitle(event.action) },
    {
      label: "Category",
      value: activityTitle(activityCategory(event.targetType)),
    },
  ];
  const metadataLabels: Record<string, string> = {
    title: "Record",
    amount: "Amount",
    currency: "Currency",
    status: "Status",
    previousValue: "Previous value",
    nextValue: "New value",
  };
  for (const [key, value] of Object.entries(event.metadata)) {
    if (!(key in metadataLabels) || value === null || value === undefined)
      continue;
    rows.push({
      label: metadataLabels[key],
      value:
        key === "amount" &&
        typeof value === "number" &&
        typeof event.metadata.currency === "string"
          ? `${value.toLocaleString()} ${event.metadata.currency}`
          : String(value).replaceAll("_", " "),
    });
  }
  return rows.filter(
    (row, index, allRows) =>
      allRows.findIndex(
        (candidate) =>
          candidate.label === row.label && candidate.value === row.value,
      ) === index,
  );
}

export function activitySummary(
  event: UserActivityEvent,
  context: {
    debts: Debt[];
    members: Member[];
    groups: Group[];
    sharedExpenses: SharedExpense[];
    groupDebts: GroupDebt[];
    payments: Payment[];
    settlementLines: SettlementLine[];
    sharedGroupMembers: SharedGroupMember[];
  },
) {
  const metadata = event.metadata;
  const debt =
    event.targetType === "debt"
      ? context.debts.find((item) => item.id === event.targetId)
      : undefined;
  const expense = event.targetType.includes("expense")
    ? context.sharedExpenses.find((item) => item.id === event.targetId)
    : undefined;
  const groupDebt = event.targetType.includes("group_debt")
    ? context.groupDebts.find((item) => item.id === event.targetId)
    : undefined;
  const payment =
    event.targetType === "payment"
      ? context.payments.find((item) => item.id === event.targetId)
      : undefined;
  const settlementLines =
    event.targetType === "settlement"
      ? context.settlementLines.filter(
          (line) => line.settlementId === event.targetId,
        )
      : [];
  const record = debt ?? expense ?? groupDebt;
  const amount =
    numberValue(metadata.amount) ?? record?.amount ?? payment?.amount;
  const currency =
    stringValue(metadata.currency) ?? record?.currency ?? payment?.currency;
  const money =
    amount !== undefined && currency
      ? `${amount.toLocaleString()} ${currency}`
      : "";
  const memberId =
    debt?.memberId ??
    stringValue(metadata.memberId) ??
    payment?.relatedMemberId;
  const memberName = firstName(
    context.members.find((member) => member.id === memberId)?.displayName,
  );
  const groupId =
    record?.groupId ?? payment?.groupId ?? stringValue(metadata.groupId);
  const groupName = context.groups.find((group) => group.id === groupId)?.name;
  const title = stringValue(metadata.title) ?? record?.title;
  const previousValue = displayMetadataValue(metadata.previousValue, currency);
  const nextValue = displayMetadataValue(metadata.nextValue, currency);

  if (event.action === "debt_created" && debt && memberName && money) {
    return debt.direction === "they_owe_me"
      ? `${memberName} owes you ${money}`
      : `You owe ${memberName} ${money}`;
  }
  if (event.action === "payment_recorded" && money) {
    const payeeName = participantFirstName(
      payment?.payeeMemberId,
      payment?.payeeGroupMemberId,
      context.members,
      context.sharedGroupMembers,
    );
    return `${money} to ${payeeName || "you"}`;
  }
  if (event.action === "settlement_record_created") {
    const firstLine = settlementLines[0];
    const settledRecord = firstLine
      ? settlementRecordLabel(firstLine, context)
      : undefined;
    const extraRecords = settlementLines.length - 1;
    const settledAmount = firstLine
      ? `${settlementLines
          .filter((line) => line.currency === firstLine.currency)
          .reduce((total, line) => total + line.appliedAmount, 0)
          .toLocaleString()} ${firstLine.currency}`
      : "";
    return (
      [
        settledRecord
          ? `${settledRecord}${extraRecords > 0 ? ` +${extraRecords} more` : ""}`
          : "",
        settledAmount,
      ]
        .filter(Boolean)
        .join(" · ") || "Debt balance cleared"
    );
  }
  if (previousValue && nextValue) return `${previousValue} → ${nextValue}`;
  if (nextValue) return nextValue;
  if (
    event.action.includes("invite") &&
    stringValue(metadata.invitedDisplayName)
  ) {
    return firstName(stringValue(metadata.invitedDisplayName));
  }
  if (event.action.includes("member") && stringValue(metadata.displayName)) {
    return firstName(stringValue(metadata.displayName));
  }
  if (event.action.includes("comment"))
    return `On ${shortTarget(metadata.targetType)}`;
  if (event.action.includes("attachment")) {
    return stringValue(metadata.attachmentKind)
      ? `${activityTitle(String(metadata.attachmentKind))} attachment`
      : `Attached to ${shortTarget(metadata.targetType)}`;
  }
  if (event.action.includes("profile")) {
    const changedFields = Array.isArray(metadata.changedFields)
      ? metadata.changedFields.filter(
          (field): field is string => typeof field === "string",
        )
      : [];
    const fieldLabels: Record<string, string> = {
      displayName: "name",
      email: "email",
      phone: "phone",
      country: "country",
      avatar: "photo",
      baseCurrency: "currency",
    };
    if (changedFields.length) {
      return changedFields
        .map((field) => fieldLabels[field] ?? field)
        .map((field) => field.charAt(0).toUpperCase() + field.slice(1))
        .join(" · ");
    }
    return [
      stringValue(metadata.displayName) ? "Name" : "",
      stringValue(metadata.baseCurrency) ? "Currency" : "",
    ]
      .filter(Boolean)
      .join(" · ");
  }
  if (event.action.includes("import")) {
    const rows = numberValue(metadata.rowCount);
    return rows === undefined
      ? "Data imported"
      : `${rows} ${rows === 1 ? "row" : "rows"}`;
  }
  if (event.action.includes("export") || event.action.includes("backup")) {
    return stringValue(metadata.format)?.toUpperCase() ?? "Data saved";
  }
  if (event.action.includes("reminder"))
    return memberName
      ? `For ${memberName}`
      : groupName
        ? `For ${groupName}`
        : "Reminder updated";
  if (title && money) return `${title} · ${money}`;
  if (title) return title;
  if (groupName) return groupName;
  if (memberName) return memberName;
  if (money) return money;
  return activityTitle(event.targetType);
}

function participantFirstName(
  memberId: string | null | undefined,
  groupMemberId: string | null | undefined,
  members: Member[],
  sharedGroupMembers: SharedGroupMember[],
) {
  return firstName(
    members.find((member) => member.id === memberId)?.displayName ??
      sharedGroupMembers.find((member) => member.id === groupMemberId)
        ?.displayName,
  );
}

function settlementRecordLabel(
  line: SettlementLine,
  context: {
    debts: Debt[];
    groupDebts: GroupDebt[];
    sharedExpenses: SharedExpense[];
  },
) {
  if (line.sourceRecordType === "simple_debt") {
    return context.debts.find((debt) => debt.id === line.sourceRecordId)?.title;
  }
  if (line.sourceRecordType === "group_debt") {
    return context.groupDebts.find((debt) => debt.id === line.sourceRecordId)
      ?.title;
  }
  if (line.sourceRecordType === "shared_expense_obligation") {
    return context.sharedExpenses.find((expense) =>
      expense.generatedObligations.some(
        (obligation) => obligation.id === line.sourceRecordId,
      ),
    )?.title;
  }
  return "Overpayment credit";
}

function firstName(value: string | null | undefined) {
  return value?.trim().split(/\s+/)[0] ?? "";
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function displayMetadataValue(value: unknown, currency?: string) {
  if (typeof value === "number")
    return currency
      ? `${value.toLocaleString()} ${currency}`
      : value.toLocaleString();
  if (typeof value === "string" && value.trim()) return activityTitle(value);
  return "";
}

function shortTarget(value: unknown) {
  return typeof value === "string" ? activityTitle(value) : "record";
}

export function activityConfirmationStatus(event: UserActivityEvent) {
  const status = String(
    event.metadata.confirmationStatus ??
      event.metadata.verificationStatus ??
      event.metadata.nextStatus ??
      event.metadata.status ??
      "",
  ).toLowerCase();
  if (
    event.action.includes("rejected") ||
    status === "rejected" ||
    status === "countered"
  )
    return "rejected" as const;
  if (
    event.action.includes("requested") ||
    status === "pending" ||
    status === "pending_confirmation" ||
    status === "partially_verified"
  ) {
    return "pending" as const;
  }
  return undefined;
}

function debtActivityVerificationStatus(
  activity: ActivityLog,
  verifications: DebtVerification[],
) {
  const field = debtActivityReviewField(activity.action);
  if (!field) {
    return activity.metadata.verificationStatus;
  }
  const activityTime = Date.parse(activity.createdAt);
  const match = verifications
    .filter((verification) => {
      if (
        verification.debtId !== activity.entityId ||
        verification.requesterUserId !== activity.actorUserId
      ) {
        return false;
      }
      const coversField =
        field === "creation"
          ? verification.requestType === "creation"
          : verification.requestType === "creation" ||
            verification.changeSummary?.changedFields.includes(field);
      const requestedTime = Date.parse(verification.requestedAt);
      return (
        coversField &&
        Number.isFinite(activityTime) &&
        Number.isFinite(requestedTime) &&
        requestedTime >= activityTime - 1_000 &&
        requestedTime - activityTime <= 5 * 60_000
      );
    })
    .sort((a, b) => a.requestedAt.localeCompare(b.requestedAt))[0];
  return match?.status ?? activity.metadata.verificationStatus;
}

function debtActivityReviewField(action: string) {
  if (action === "debt_created") return "creation" as const;
  if (action === "debt_amount_changed") return "amount" as const;
  if (action === "debt_direction_changed") return "direction" as const;
  if (action === "debt_title_changed") return "title" as const;
  if (action === "debt_member_changed") return "member" as const;
  if (["debt_archived", "debt_reopened", "debt_status_changed"].includes(action))
    return "status" as const;
  if (
    [
      "debt_due_date_added",
      "debt_due_date_changed",
      "debt_due_date_removed",
    ].includes(action)
  )
    return "dueDate" as const;
  return null;
}
