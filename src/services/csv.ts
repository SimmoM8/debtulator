import type {
  CurrencyCode,
  Debt,
  DebtDirection,
  Group,
  LedgerEntry,
  Member,
  Payment,
  RecurringTemplate,
  Settlement,
  Tag,
} from '@/src/types/models';
import { CURRENCIES } from '@/src/constants/currencies';

export type CsvExportOptions = {
  includeNotes: boolean;
  includeArchived: boolean;
  includeRejectedDisputed: boolean;
};

export type ParsedCsvRow = Record<string, string>;

export type ImportPreviewRow = {
  index: number;
  raw: ParsedCsvRow;
  kind: 'member' | 'debt';
  valid: boolean;
  warnings: string[];
  errors: string[];
  normalized: {
    displayName?: string;
    email?: string | null;
    phone?: string | null;
    title?: string;
    memberName?: string;
    direction?: DebtDirection;
    amount?: number;
    currency?: CurrencyCode;
    date?: string;
    dueDate?: string | null;
    notes?: string | null;
    tags?: string[];
    status?: Debt['status'];
  };
};

const SUPPORTED_CURRENCIES = new Set(CURRENCIES);

export function parseCsv(text: string) {
  const rows: string[][] = [];
  let current = '';
  let row: string[] = [];
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(current);
      current = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') {
        index += 1;
      }
      row.push(current);
      if (row.some((cell) => cell.trim())) {
        rows.push(row);
      }
      row = [];
      current = '';
    } else {
      current += char;
    }
  }

  row.push(current);
  if (row.some((cell) => cell.trim())) {
    rows.push(row);
  }

  if (rows.length === 0) {
    return [];
  }
  const headers = rows[0].map(normalizeHeader);
  return rows.slice(1).map<ParsedCsvRow>((cells) =>
    Object.fromEntries(headers.map((header, index) => [header, cells[index]?.trim() ?? ''])),
  );
}

export function previewCsvImport(text: string, members: Member[]) {
  const parsedRows = parseCsv(text);
  const existingNames = new Set(members.map((member) => member.displayName.trim().toLowerCase()));
  const seenDebtKeys = new Set<string>();

  return parsedRows.map<ImportPreviewRow>((raw, index) => {
    const hasDebtColumns = Boolean(valueFor(raw, ['title', 'debt_title']) || valueFor(raw, ['amount']));
    const kind: ImportPreviewRow['kind'] = hasDebtColumns ? 'debt' : 'member';
    const warnings: string[] = [];
    const errors: string[] = [];
    const displayName = valueFor(raw, ['display_name', 'name', 'member_name']);
    const memberName = valueFor(raw, ['member_name', 'member', 'person', 'display_name']);
    const email = valueFor(raw, ['email']) || null;
    const phone = valueFor(raw, ['phone']) || null;

    if (kind === 'member') {
      if (!displayName) {
        errors.push('display_name is required.');
      } else if (existingNames.has(displayName.toLowerCase())) {
        warnings.push('Possible duplicate member name.');
      }
      return {
        index,
        raw,
        kind,
        valid: errors.length === 0,
        warnings,
        errors,
        normalized: {
          displayName,
          email,
          phone,
          notes: valueFor(raw, ['notes', 'note']) || null,
          tags: splitTags(valueFor(raw, ['tags'])),
        },
      };
    }

    const title = valueFor(raw, ['title', 'debt_title']);
    const amount = Number(valueFor(raw, ['amount']));
    const currency = valueFor(raw, ['currency']).toUpperCase() as CurrencyCode;
    const direction = normalizeDirection(valueFor(raw, ['direction']));
    const date = valueFor(raw, ['date', 'debt_date']);
    const dueDate = valueFor(raw, ['due_date', 'due']) || null;
    const status = normalizeStatus(valueFor(raw, ['status']));

    if (!title) {
      errors.push('title is required.');
    }
    if (!memberName) {
      errors.push('member_name is required.');
    } else if (!existingNames.has(memberName.toLowerCase())) {
      warnings.push('Member will be created if it does not already exist.');
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      errors.push('amount must be numeric and above zero.');
    }
    if (!SUPPORTED_CURRENCIES.has(currency)) {
      errors.push('currency must be one of the supported app currencies.');
    }
    if (!direction) {
      errors.push('direction must be "they owe me" or "I owe them".');
    }
    if (date && Number.isNaN(new Date(`${date}T00:00:00.000Z`).getTime())) {
      errors.push('date must be valid.');
    }
    if (dueDate && Number.isNaN(new Date(`${dueDate}T00:00:00.000Z`).getTime())) {
      errors.push('due_date must be valid.');
    }

    const duplicateKey = [memberName.toLowerCase(), title.toLowerCase(), amount, currency, date].join('|');
    if (seenDebtKeys.has(duplicateKey)) {
      warnings.push('Possible duplicate row in this CSV.');
    }
    seenDebtKeys.add(duplicateKey);

    return {
      index,
      raw,
      kind,
      valid: errors.length === 0,
      warnings,
      errors,
      normalized: {
        title,
        memberName,
        direction: direction ?? undefined,
        amount,
        currency,
        date,
        dueDate,
        notes: valueFor(raw, ['notes', 'note']) || null,
        tags: splitTags(valueFor(raw, ['tags'])),
        status,
      },
    };
  });
}

export function membersToCsv(members: Member[], options: CsvExportOptions) {
  return toCsv(
    ['id', 'display_name', 'email', 'phone', 'link_status', 'tags', 'notes', 'archived', 'created_at', 'updated_at'],
    members
      .filter((member) => options.includeArchived || !member.archived)
      .map((member) => [
        member.id,
        member.displayName,
        member.email,
        member.phone,
        member.linkStatus,
        member.tags.join('|'),
        options.includeNotes ? member.notes : '',
        member.archived,
        member.createdAt,
        member.updatedAt,
      ]),
  );
}

export function debtsToCsv(entries: LedgerEntry[], options: CsvExportOptions) {
  return toCsv(
    [
      'ledger_id',
      'kind',
      'source_id',
      'group_id',
      'from_id',
      'to_id',
      'title',
      'amount_remaining',
      'original_amount',
      'amount_paid',
      'overpaid_amount',
      'currency',
      'date',
      'due_date',
      'status',
      'verification_status',
      'payment_status',
      'visibility',
      'sync_status',
      'tags',
      'notes',
    ],
    entries
      .filter((entry) => options.includeArchived || entry.status !== 'archived')
      .filter((entry) => options.includeRejectedDisputed || !['rejected', 'disputed'].includes(entry.verificationStatus))
      .map((entry) => [
        entry.id,
        entry.kind,
        entry.sourceId,
        entry.groupId,
        entry.fromId,
        entry.toId,
        entry.title,
        entry.remainingAmount,
        entry.originalAmount,
        entry.amountPaid,
        entry.overpaidAmount,
        entry.currency,
        entry.date,
        entry.dueDate,
        entry.status,
        entry.verificationStatus,
        entry.paymentStatus,
        entry.visibility,
        entry.syncStatus,
        entry.tags.join('|'),
        options.includeNotes ? entry.notes : '',
      ]),
  );
}

export function groupsToCsv(groups: Group[], options: CsvExportOptions) {
  return toCsv(
    ['id', 'name', 'status', 'visibility', 'default_currency', 'allowed_currencies', 'tags', 'notes', 'archived', 'created_at', 'updated_at'],
    groups
      .filter((group) => options.includeArchived || !group.archived)
      .map((group) => [
        group.id,
        group.name,
        group.status,
        group.visibility,
        group.defaultCurrency,
        group.allowedCurrencies.join('|'),
        group.tags.join('|'),
        options.includeNotes ? group.notes : '',
        group.archived,
        group.createdAt,
        group.updatedAt,
      ]),
  );
}

export function paymentsToCsv(payments: Payment[], options: CsvExportOptions) {
  return toCsv(
    ['id', 'group_id', 'related_member_id', 'payer_member_id', 'payee_member_id', 'payer_group_member_id', 'payee_group_member_id', 'amount', 'currency', 'payment_date', 'status', 'confirmation_status', 'visibility', 'notes', 'created_at', 'updated_at'],
    payments
      .filter((payment) => options.includeArchived || payment.status !== 'archived')
      .map((payment) => [
        payment.id,
        payment.groupId,
        payment.relatedMemberId,
        payment.payerMemberId,
        payment.payeeMemberId,
        payment.payerGroupMemberId,
        payment.payeeGroupMemberId,
        payment.amount,
        payment.currency,
        payment.paymentDate,
        payment.status,
        payment.confirmationStatus,
        payment.visibility,
        options.includeNotes ? payment.notes : '',
        payment.createdAt,
        payment.updatedAt,
      ]),
  );
}

export function settlementsToCsv(settlements: Settlement[], options: CsvExportOptions) {
  return toCsv(
    ['id', 'group_id', 'member_id', 'type', 'total_amount', 'currency', 'status', 'confirmation_status', 'original_currency', 'original_amount', 'settlement_currency', 'settlement_amount', 'exchange_rate_used', 'exchange_rate_date', 'notes', 'created_at', 'updated_at'],
    settlements
      .filter((settlement) => options.includeArchived || settlement.status !== 'archived')
      .map((settlement) => [
        settlement.id,
        settlement.groupId,
        settlement.memberId,
        settlement.type,
        settlement.totalAmount,
        settlement.currency,
        settlement.status,
        settlement.confirmationStatus,
        settlement.originalCurrency,
        settlement.originalAmount,
        settlement.settlementCurrency,
        settlement.settlementAmount,
        settlement.exchangeRateUsed,
        settlement.exchangeRateDate,
        options.includeNotes ? settlement.notes : '',
        settlement.createdAt,
        settlement.updatedAt,
      ]),
  );
}

export function recurringTemplatesToCsv(templates: RecurringTemplate[]) {
  return toCsv(
    ['id', 'type', 'title', 'amount', 'currency', 'recurrence_rule', 'start_date', 'end_date', 'next_occurrence_date', 'status', 'auto_generate', 'group_id', 'member_id', 'created_at', 'updated_at'],
    templates.map((template) => [
      template.id,
      template.type,
      template.title,
      template.amount,
      template.currency,
      template.recurrenceRule,
      template.startDate,
      template.endDate,
      template.nextOccurrenceDate,
      template.status,
      template.autoGenerate,
      template.groupId,
      template.memberId,
      template.createdAt,
      template.updatedAt,
    ]),
  );
}

export function tagsToCsv(tags: Tag[]) {
  return toCsv(['id', 'name', 'color', 'created_at'], tags.map((tag) => [tag.id, tag.name, tag.color, tag.createdAt]));
}

export function toCsv(headers: string[], rows: unknown[][]) {
  return [headers, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\n');
}

function escapeCsvCell(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function valueFor(row: ParsedCsvRow, keys: string[]) {
  for (const key of keys) {
    const normalized = normalizeHeader(key);
    if (row[normalized]) {
      return row[normalized].trim();
    }
  }
  return '';
}

function normalizeDirection(value: string): DebtDirection | null {
  const clean = value.trim().toLowerCase().replace(/[_-]+/g, ' ');
  if (['they owe me', 'owes me', 'to me', 'credit', 'they_owe_me'].includes(clean)) {
    return 'they_owe_me';
  }
  if (['i owe them', 'i owe', 'owe them', 'debit', 'i_owe_them'].includes(clean)) {
    return 'i_owe_them';
  }
  return null;
}

function normalizeStatus(value: string): Debt['status'] {
  const clean = value.trim().toLowerCase();
  return clean === 'settled' || clean === 'archived' ? clean : 'active';
}

function splitTags(value: string) {
  return value
    .split(/[|,]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}
