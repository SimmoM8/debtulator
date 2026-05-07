import * as FileSystem from 'expo-file-system/legacy';

import { supabase } from '@/src/services/supabase';
import type { Attachment, Comment, ExportLog, SmartSuggestion } from '@/src/types/models';

const ATTACHMENT_BUCKET = 'debtulator-attachments';

export async function uploadSharedAttachment(attachment: Attachment) {
  if (!supabase || attachment.visibility !== 'shared' || !attachment.localUri) {
    return null;
  }

  const storagePath =
    attachment.storagePath ??
    `${attachment.eventId ? `events/${attachment.eventId}` : 'shared'}/${attachment.targetType}/${attachment.targetId}/${attachment.id}-${attachment.fileName}`;
  const base64 = await FileSystem.readAsStringAsync(attachment.localUri, { encoding: FileSystem.EncodingType.Base64 });
  const arrayBuffer = base64ToArrayBuffer(base64);
  const { error } = await supabase.storage.from(ATTACHMENT_BUCKET).upload(storagePath, arrayBuffer, {
    contentType: attachment.mimeType,
    upsert: true,
  });
  if (error) {
    throw error;
  }
  const signed = await supabase.storage.from(ATTACHMENT_BUCKET).createSignedUrl(storagePath, 60 * 10);
  return {
    storagePath,
    remoteUrl: signed.data?.signedUrl ?? null,
  };
}

export async function createRemoteComment(comment: Comment) {
  if (!supabase || comment.visibility !== 'shared') {
    return null;
  }
  const { data, error } = await supabase
    .from('comments')
    .insert({
      target_type: comment.targetType,
      target_id: comment.targetId,
      event_id: comment.eventId,
      author_user_id: comment.authorUserId,
      body: comment.body,
      visibility: comment.visibility,
    })
    .select('id')
    .single();
  if (error) {
    throw error;
  }
  return data?.id ?? null;
}

export async function createRemoteSmartSuggestion(suggestion: SmartSuggestion) {
  if (!supabase || !suggestion.userId) {
    return null;
  }
  await supabase.from('smart_suggestions').upsert({
    id: suggestion.id,
    user_id: suggestion.userId,
    suggestion_type: suggestion.suggestionType,
    target_type: suggestion.targetType,
    target_id: suggestion.targetId,
    title: suggestion.title,
    message: suggestion.message,
    metadata: suggestion.metadata,
    status: suggestion.status,
  });
}

export async function createRemoteExportLog(exportLog: ExportLog) {
  if (!supabase || !exportLog.userId) {
    return null;
  }
  await supabase.from('export_logs').insert({
    user_id: exportLog.userId,
    export_type: exportLog.exportType,
    target_type: exportLog.targetType,
    target_id: exportLog.targetId,
    metadata: exportLog.metadata,
  });
}

function base64ToArrayBuffer(base64: string) {
  const binary = globalThis.atob ? globalThis.atob(base64) : '';
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}
