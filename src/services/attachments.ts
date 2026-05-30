import type { Attachment, AttachmentKind, AttachmentTargetType, AttachmentVisibility } from '@/src/types/models';

export const MAX_ATTACHMENT_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const SUPPORTED_ATTACHMENT_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.pdf', '.heic', '.heif', '.webp'];
// Keep an extension fallback for picker sources that do not provide reliable MIME metadata.
const SUPPORTED_CSV_MIME_TYPES = ['text/csv', 'text/comma-separated-values', 'application/csv', 'application/vnd.ms-excel'];

export const ATTACHMENT_KIND_LABELS: Record<AttachmentKind, string> = {
  receipt: 'Receipt',
  proof: 'Proof',
  screenshot: 'Screenshot',
  invoice: 'Invoice',
  other: 'Other',
};

export const ATTACHMENT_TARGET_LABELS: Record<AttachmentTargetType, string> = {
  debt: 'Debt',
  shared_expense: 'Expense',
  event_debt: 'Event debt',
  payment: 'Payment',
  settlement: 'Settlement',
  event: 'Event',
  comment: 'Comment',
};

export function activeAttachmentsForTarget(
  attachments: Attachment[],
  targetType: AttachmentTargetType,
  targetId: string,
) {
  return attachments.filter(
    (attachment) =>
      attachment.targetType === targetType &&
      attachment.targetId === targetId &&
      !attachment.archivedAt,
  );
}

export function attachmentBadges(attachments: Attachment[]) {
  const active = attachments.filter((attachment) => !attachment.archivedAt);
  return {
    hasAttachment: active.length > 0,
    hasReceipt: active.some((attachment) => attachment.attachmentKind === 'receipt'),
    hasProof: active.some((attachment) => attachment.attachmentKind === 'proof'),
    receiptLabel: active.some((attachment) => attachment.attachmentKind === 'receipt') ? 'Receipt attached' : null,
    proofLabel: active.some((attachment) => attachment.attachmentKind === 'proof') ? 'Proof attached' : null,
  };
}

export function formatFileSize(bytes: number) {
  if (!bytes || bytes <= 0) {
    return 'Unknown size';
  }
  if (bytes < 1024) {
    return `${Math.round(bytes)} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 102.4) / 10} KB`;
  }
  return `${Math.round(bytes / 1024 / 102.4) / 10} MB`;
}

export function fileNameFromUri(uri: string, fallback: string) {
  const clean = uri.split('?')[0] ?? uri;
  const name = clean.split('/').filter(Boolean).pop();
  return name || fallback;
}

export function inferAttachmentVisibility(parentVisibility: string | null | undefined): AttachmentVisibility {
  return parentVisibility === 'shared' ||
    parentVisibility === 'shared_event' ||
    parentVisibility === 'shared_with_involved_member'
    ? 'shared'
    : 'private';
}

export function isSupportedAttachmentFile(input: { fileName?: string | null; mimeType?: string | null }) {
  const lowerName = input.fileName?.toLowerCase() ?? '';
  const lowerMime = input.mimeType?.toLowerCase() ?? '';
  if (lowerMime === 'application/pdf' || lowerMime.startsWith('image/')) {
    return true;
  }
  return SUPPORTED_ATTACHMENT_EXTENSIONS.some((extension) => lowerName.endsWith(extension));
}

export function isSupportedCsvFile(input: { fileName?: string | null; mimeType?: string | null }) {
  const lowerName = input.fileName?.toLowerCase() ?? '';
  const lowerMime = input.mimeType?.toLowerCase() ?? '';
  if (lowerName.endsWith('.csv')) {
    return true;
  }
  return SUPPORTED_CSV_MIME_TYPES.includes(lowerMime);
}

export function storagePathForAttachment(input: {
  eventId?: string | null;
  targetType: AttachmentTargetType;
  targetId: string;
  fileName: string;
}) {
  const safeFileName = input.fileName.replace(/[^a-z0-9._-]+/gi, '-').toLowerCase();
  const prefix = input.eventId ? `events/${input.eventId}` : 'private';
  return `${prefix}/${input.targetType}/${input.targetId}/${Date.now()}-${safeFileName}`;
}
