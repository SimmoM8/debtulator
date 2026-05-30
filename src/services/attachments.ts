import type { Attachment, AttachmentKind, AttachmentTargetType, AttachmentVisibility } from '@/src/types/models';

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

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

const SUPPORTED_MIME_TYPES = new Set([
  'application/pdf',
  'image/heic',
  'image/heif',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'text/csv',
  'text/plain',
]);

const MIME_BY_EXTENSION: Record<string, string> = {
  csv: 'text/csv',
  heic: 'image/heic',
  heif: 'image/heif',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  pdf: 'application/pdf',
  png: 'image/png',
  txt: 'text/plain',
  webp: 'image/webp',
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
  return name ? decodeURIComponent(name) : fallback;
}

export function inferMimeType(fileName: string, fallback = 'application/octet-stream') {
  const extension = extensionFromFileName(fileName);
  return extension ? MIME_BY_EXTENSION[extension] ?? fallback : fallback;
}

export function inferFileType(mimeType: string, fileName: string) {
  if (mimeType.startsWith('image/')) {
    return 'image';
  }
  if (mimeType === 'application/pdf') {
    return 'pdf';
  }
  return extensionFromFileName(fileName) || 'file';
}

export function validateAttachmentCandidate(input: {
  fileName: string;
  mimeType?: string | null;
  fileSize?: number | null;
}) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const cleanName = input.fileName.trim();
  const normalizedMime = normalizeMimeType(input.mimeType, cleanName);
  const size = Number(input.fileSize) || 0;

  if (!cleanName) {
    errors.push('Choose a file before adding the attachment.');
  }
  if (!isSupportedAttachmentMime(normalizedMime, cleanName)) {
    errors.push('Use a supported file type: JPG, PNG, HEIC, WebP, PDF, CSV, or TXT.');
  }
  if (size > MAX_ATTACHMENT_BYTES) {
    errors.push(`Attachment must be ${formatFileSize(MAX_ATTACHMENT_BYTES)} or smaller.`);
  } else if (size <= 0) {
    warnings.push('File size was not reported by the picker, so the app will save it as an unknown-size reference.');
  }

  return {
    errors,
    warnings,
    valid: errors.length === 0,
    mimeType: normalizedMime,
    fileSize: size,
  };
}

export function inferAttachmentVisibility(parentVisibility: string | null | undefined): AttachmentVisibility {
  return parentVisibility === 'shared' ||
    parentVisibility === 'shared_event' ||
    parentVisibility === 'shared_with_involved_member'
    ? 'shared'
    : 'private';
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

function normalizeMimeType(mimeType: string | null | undefined, fileName: string) {
  const cleanMime = mimeType?.split(';')[0]?.trim().toLowerCase();
  if (cleanMime && cleanMime !== 'application/octet-stream') {
    return cleanMime;
  }
  return inferMimeType(fileName);
}

function isSupportedAttachmentMime(mimeType: string, fileName: string) {
  return SUPPORTED_MIME_TYPES.has(mimeType) || Boolean(MIME_BY_EXTENSION[extensionFromFileName(fileName)]);
}

function extensionFromFileName(fileName: string) {
  const clean = fileName.split('?')[0]?.split('#')[0] ?? fileName;
  const extension = clean.includes('.') ? clean.split('.').pop()?.trim().toLowerCase() : '';
  return extension ?? '';
}
