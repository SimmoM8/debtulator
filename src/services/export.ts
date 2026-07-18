import * as FileSystem from 'expo-file-system/legacy';
import { Share } from 'react-native';

import type {
  AppSettings,
  Attachment,
  Comment,
  CurrencyRate,
  Debt,
  Group,
  GroupSettlementExplanation,
  LedgerEntry,
  Member,
  Payment,
  Settlement,
  SharedGroupMember,
  SharedExpense,
} from '@/src/types/models';
import { estimateMoneyMap } from '@/src/services/currency';
import { participantName } from '@/src/services/ledger';
import { addTelemetryBreadcrumb, captureTelemetryException, trackFirstSuccess, trackTelemetryEvent } from '@/src/services/telemetry';
import { formatMoney, formatMoneyMap } from '@/src/utils/money';

export type PrivacyExportOptions = {
  includePrivateNotes: boolean;
  includeComments: boolean;
  includeAttachments: boolean;
  includeRejectedDisputed: boolean;
  includeArchived: boolean;
};

export type ExportSnapshot = {
  members: Member[];
  sharedGroupMembers: SharedGroupMember[];
  debts: Debt[];
  sharedExpenses: SharedExpense[];
  payments: Payment[];
  settlements: Settlement[];
  attachments: Attachment[];
  comments: Comment[];
  settings: AppSettings;
  currencyRates: CurrencyRate[];
};

export const PORTABLE_ATTACHMENT_MAX_BYTES = 25 * 1024 * 1024;

const PORTABLE_ATTACHMENT_MIME_TYPES = new Set([
  'application/pdf',
  'text/csv',
  'text/plain',
]);

export function sanitizeAttachmentsForPortableExport(attachments: Attachment[]) {
  const unsafeAttachment = attachments.find((attachment) => !isPortableAttachmentSafe(attachment));
  if (unsafeAttachment) {
    const reason = unsafeAttachmentReason(unsafeAttachment);
    if (reason) {
      throw new Error(reason);
    }
  }
  return attachments.map((attachment) => ({
    ...attachment,
    localUri: null,
    remoteUrl: null,
    storagePath: null,
    thumbnailUri: null,
  }));
}

export function groupTextSummary(input: {
  group: Group;
  explanation: GroupSettlementExplanation;
  snapshot: ExportSnapshot;
  options: PrivacyExportOptions;
}) {
  const generated = new Date().toLocaleString();
  const lines = [
    `Debtulator summary for ${input.group.name}`,
    `Generated: ${generated}`,
    `Status: ${input.group.status}`,
    '',
    'Balances:',
  ];

  for (const [participantId, moneyMap] of Object.entries(input.explanation.participantNets)) {
    lines.push(
      `${participantName(participantId, input.snapshot.members, input.snapshot.sharedGroupMembers)}: ${formatMoneyMap(moneyMap)}`,
    );
  }

  const suggestions = input.explanation.suggestions.filter(
    (suggestion) => input.options.includeRejectedDisputed || !input.explanation.excludedEntries.some((item) => item.entry.id === suggestion.id),
  );
  lines.push('', 'Suggested settlements:');
  if (suggestions.length === 0) {
    lines.push('No open settlement suggestions with the selected privacy settings.');
  } else {
    for (const suggestion of suggestions) {
      lines.push(
        `${participantName(suggestion.fromId, input.snapshot.members, input.snapshot.sharedGroupMembers)} pays ${participantName(
          suggestion.toId,
          input.snapshot.members,
          input.snapshot.sharedGroupMembers,
        )} ${formatMoney(suggestion.amount, suggestion.currency)}`,
      );
    }
  }

  if (input.snapshot.settings.showEstimatedBase) {
    lines.push('', `Estimated values are approximate and use the local ${input.snapshot.settings.baseCurrency} exchange-rate table.`);
  }

  return lines.join('\n');
}

export function groupPdfLines(input: {
  group: Group;
  explanation: GroupSettlementExplanation;
  snapshot: ExportSnapshot;
  options: PrivacyExportOptions;
}) {
  const groupEntries = input.explanation.includedEntries.concat(input.explanation.excludedEntries.map((item) => item.entry));
  const currencies = new Set(groupEntries.map((entry) => entry.currency));
  const lines = [
    `Debtulator Group Summary: ${input.group.name}`,
    `Generated: ${new Date().toLocaleString()}`,
    `Status: ${input.group.status} | Visibility: ${input.group.visibility}`,
    `Currencies: ${Array.from(currencies).join(', ') || input.group.defaultCurrency}`,
    '',
    'Members',
    ...Object.keys(input.explanation.participantNets).map((participantId) =>
      `- ${participantName(participantId, input.snapshot.members, input.snapshot.sharedGroupMembers)}`,
    ),
    '',
    'Included records',
    ...input.explanation.includedEntries.map((entry) => recordLine(entry, input.snapshot, input.options)),
    '',
    'Excluded records and reasons',
    ...(input.explanation.excludedEntries.length
      ? input.explanation.excludedEntries.map(({ entry, reason }) => `- ${entry.title}: ${reason.replaceAll('_', ' ')}`)
      : ['- None']),
    '',
    'Balances by member and currency',
    ...Object.entries(input.explanation.participantNets).map(
      ([participantId, moneyMap]) =>
        `- ${participantName(participantId, input.snapshot.members, input.snapshot.sharedGroupMembers)}: ${formatMoneyMap(moneyMap)}`,
    ),
    '',
    'Settlement suggestions by currency',
    ...(input.explanation.suggestions.length
      ? input.explanation.suggestions.map(
          (suggestion) =>
            `- ${participantName(suggestion.fromId, input.snapshot.members, input.snapshot.sharedGroupMembers)} pays ${participantName(
              suggestion.toId,
              input.snapshot.members,
              input.snapshot.sharedGroupMembers,
            )} ${formatMoney(suggestion.amount, suggestion.currency)}`,
        )
      : ['- No suggestions']),
    '',
    'Calculation settings',
    `- Include pending: ${input.explanation.settings.includePending}`,
    `- Include rejected/disputed: ${input.explanation.settings.includeRejectedDisputed}`,
    `- Include archived: ${input.explanation.settings.includeArchived}`,
    `- Include settled: ${input.explanation.settings.includeSettled}`,
    `- Verified only: ${input.explanation.settings.verifiedOnly}`,
    '',
    'Transparency note',
    'Native currencies are kept separate. Converted balances, when shown, are approximate.',
  ];

  return includeSupplementalLines(lines, groupEntries, input.snapshot, input.options);
}

export function memberPdfLines(input: {
  member: Member;
  entries: LedgerEntry[];
  payments: Payment[];
  settlements: Settlement[];
  snapshot: ExportSnapshot;
  options: PrivacyExportOptions;
}) {
  const nativeBalances: Record<string, number> = {};
  for (const entry of input.entries) {
    nativeBalances[entry.currency] ??= 0;
    nativeBalances[entry.currency] += entry.toId === 'me' ? entry.remainingAmount : -entry.remainingAmount;
  }
  const estimated = estimateMoneyMap(nativeBalances, input.snapshot.settings, input.snapshot.currencyRates);
  return includeSupplementalLines(
    [
      `Debtulator Member Summary: ${input.member.displayName}`,
      `Generated: ${new Date().toLocaleString()}`,
      `Linked status: ${input.member.linkStatus}`,
      `Native balance: ${formatMoneyMap(nativeBalances)}`,
      `Estimated ${input.snapshot.settings.baseCurrency}: approx. ${formatMoney(estimated, input.snapshot.settings.baseCurrency)}`,
      '',
      'Debts and obligations',
      ...(input.entries.length ? input.entries.map((entry) => recordLine(entry, input.snapshot, input.options)) : ['- No debt history']),
      '',
      'Payments',
      ...(input.payments.length
        ? input.payments.map((payment) => `- ${payment.paymentDate}: ${formatMoney(payment.amount, payment.currency)} (${payment.status})`)
        : ['- No payments']),
      '',
      'Settlements',
      ...(input.settlements.length
        ? input.settlements.map((settlement) => `- ${settlement.createdAt.slice(0, 10)}: ${formatMoney(settlement.totalAmount, settlement.currency)} (${settlement.status})`)
        : ['- No settlements']),
    ],
    input.entries,
    input.snapshot,
    input.options,
  ).filter(Boolean);
}

export function debtPdfLines(input: {
  title: string;
  entries: LedgerEntry[];
  payments: Payment[];
  settlements: Settlement[];
  snapshot: ExportSnapshot;
  options: PrivacyExportOptions;
}) {
  return includeSupplementalLines(
    [
      `Debtulator Detail Export: ${input.title}`,
      `Generated: ${new Date().toLocaleString()}`,
      '',
      'Calculation explanation',
      'Original amount minus active settlement lines equals remaining amount. Rejected/cancelled payments are ignored.',
      '',
      'Records',
      ...input.entries.map((entry) => recordLine(entry, input.snapshot, input.options)),
      '',
      'Payment history',
      ...(input.payments.length
        ? input.payments.map((payment) => `- ${payment.paymentDate}: ${formatMoney(payment.amount, payment.currency)} (${payment.status})`)
        : ['- No payments']),
      '',
      'Settlement history',
      ...(input.settlements.length
        ? input.settlements.map((settlement) => `- ${settlement.createdAt.slice(0, 10)}: ${formatMoney(settlement.totalAmount, settlement.currency)} (${settlement.type})`)
        : ['- No settlements']),
    ],
    input.entries,
    input.snapshot,
    input.options,
  );
}

export async function writeTextExport(fileName: string, text: string) {
  const uri = `${FileSystem.documentDirectory ?? ''}${safeFileName(fileName)}`;
  try {
    await FileSystem.writeAsStringAsync(uri, text, { encoding: FileSystem.EncodingType.UTF8 });
    addTelemetryBreadcrumb('export', 'text_file_written', { result: 'success' });
    trackTelemetryEvent('export_text_generated', { result: 'success' });
    return uri;
  } catch (error) {
    addTelemetryBreadcrumb('export', 'text_file_write_failed', { result: 'failure' });
    captureTelemetryException(error, 'export_write_text', {});
    throw error;
  }
}

export async function writePdfExport(fileName: string, lines: string[]) {
  const uri = `${FileSystem.documentDirectory ?? ''}${safeFileName(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`)}`;
  try {
    await FileSystem.writeAsStringAsync(uri, buildSimplePdf(lines), { encoding: FileSystem.EncodingType.UTF8 });
    addTelemetryBreadcrumb('export', 'pdf_file_written', { result: 'success' });
    trackTelemetryEvent('export_pdf_generated', { result: 'success' });
    return uri;
  } catch (error) {
    addTelemetryBreadcrumb('export', 'pdf_file_write_failed', { result: 'failure' });
    captureTelemetryException(error, 'export_write_pdf', {});
    throw error;
  }
}

export async function shareExport(uri: string, title: string, message?: string) {
  try {
    await Share.share({ title, message: message ?? title, url: uri });
    addTelemetryBreadcrumb('export', 'share_completed', { result: 'success' });
    trackTelemetryEvent('export_share_completed', { result: 'success' });
    trackFirstSuccess('export', { source: 'share' });
  } catch (error) {
    addTelemetryBreadcrumb('export', 'share_failed', { result: 'failure' });
    captureTelemetryException(error, 'export_share', {});
    throw error;
  }
}

function recordLine(entry: LedgerEntry, snapshot: ExportSnapshot, options: PrivacyExportOptions) {
  const notes = options.includePrivateNotes && entry.notes ? ` | notes: ${entry.notes}` : '';
  return `- ${entry.title}: ${participantName(entry.fromId, snapshot.members, snapshot.sharedGroupMembers)} pays ${participantName(
    entry.toId,
    snapshot.members,
    snapshot.sharedGroupMembers,
  )} ${formatMoney(entry.remainingAmount, entry.currency)} | original ${formatMoney(entry.originalAmount, entry.currency)} | paid ${formatMoney(
    entry.amountPaid,
    entry.currency,
  )} | ${entry.status}/${entry.verificationStatus}/${entry.paymentStatus}${notes}`;
}

function includeSupplementalLines(
  lines: string[],
  entries: LedgerEntry[],
  snapshot: ExportSnapshot,
  options: PrivacyExportOptions,
) {
  const recordIds = new Set(entries.flatMap((entry) => [entry.sourceId, entry.expenseId]).filter(Boolean));
  if (options.includeComments) {
    const comments = snapshot.comments.filter((comment) => !comment.deletedAt && recordIds.has(comment.targetId));
    lines.push('', 'Comments included by explicit export option');
    lines.push(...(comments.length ? comments.map((comment) => `- ${comment.visibility}: ${comment.body}`) : ['- None']));
  }
  if (options.includeAttachments) {
    const attachments = snapshot.attachments.filter((attachment) => !attachment.archivedAt && recordIds.has(attachment.targetId));
    lines.push('', 'Attachment references included by explicit export option');
    lines.push(
      ...(attachments.length
        ? attachments.map((attachment) => `- ${attachment.attachmentKind}: ${attachment.fileName} (${attachment.mimeType})`)
        : ['- None']),
    );
  }
  return lines;
}

function buildSimplePdf(lines: string[]) {
  const pages = chunkLines(lines.flatMap((line) => wrapLine(ascii(line), 92)), 42);
  const objects: string[] = [];
  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  const pageObjectIds = pages.map((_, index) => 3 + index * 2);
  objects.push(`<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`);
  for (let index = 0; index < pages.length; index += 1) {
    const pageObjectId = pageObjectIds[index];
    const contentObjectId = pageObjectId + 1;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents ${contentObjectId} 0 R >>`);
    const stream = pageStream(pages[index]);
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  }

  let body = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(body.length);
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) {
    body += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return body;
}

function pageStream(lines: string[]) {
  const escaped = lines.map(escapePdfText);
  return ['BT', '/F1 10 Tf', '50 742 Td', '14 TL', ...escaped.map((line) => `(${line}) Tj T*`), 'ET'].join('\n');
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function wrapLine(line: string, width: number) {
  const words = line.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (`${current} ${word}`.trim().length > width) {
      lines.push(current);
      current = word;
    } else {
      current = `${current} ${word}`.trim();
    }
  }
  lines.push(current);
  return lines;
}

function chunkLines(lines: string[], size: number) {
  const chunks: string[][] = [];
  for (let index = 0; index < Math.max(lines.length, 1); index += size) {
    chunks.push(lines.slice(index, index + size));
  }
  return chunks.length ? chunks : [['No data']];
}

function safeFileName(fileName: string) {
  return fileName.replace(/[^a-z0-9._-]+/gi, '-').toLowerCase();
}

function ascii(value: string) {
  return value.replace(/[^\x20-\x7E]/g, '-');
}

function isPortableAttachmentSafe(attachment: Attachment) {
  return !unsafeAttachmentReason(attachment);
}

function unsafeAttachmentReason(attachment: Attachment): string | null {
  const label = attachment.fileName?.trim() || attachment.id;
  if (!attachment.fileName?.trim()) {
    return `Attachment ${label} has no file name and cannot be exported.`;
  }
  if (/[/\\]/.test(attachment.fileName) || attachment.fileName.includes('..')) {
    return `Attachment ${label} has an unsafe file name.`;
  }
  if (!Number.isFinite(attachment.fileSize) || attachment.fileSize < 0) {
    return `Attachment ${label} has an invalid file size.`;
  }
  if (attachment.fileSize > PORTABLE_ATTACHMENT_MAX_BYTES) {
    return `Attachment ${label} is larger than the ${Math.round(PORTABLE_ATTACHMENT_MAX_BYTES / 1024 / 1024)} MB export limit.`;
  }
  const mime = attachment.mimeType?.trim().toLowerCase();
  if (!isAllowedPortableMimeType(mime)) {
    return `Attachment ${label} has unsupported MIME type "${attachment.mimeType || 'unknown'}".`;
  }
  return null;
}

function isAllowedPortableMimeType(mime: string | undefined) {
  if (!mime) {
    return false;
  }
  return mime.startsWith('image/') || PORTABLE_ATTACHMENT_MIME_TYPES.has(mime);
}
