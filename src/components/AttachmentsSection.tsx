import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/src/components/ui/Badges';
import { Button, Card, EmptyState, SectionTitle, SelectChips, TextField } from '@/src/components/ui/Primitives';
import { palette, radii, spacing,
typography,
} from '@/src/constants/design';
import {
  ATTACHMENT_KIND_LABELS,
  activeAttachmentsForTarget,
  fileNameFromUri,
  formatFileSize,
  inferAttachmentVisibility,
  storagePathForAttachment,
} from '@/src/services/attachments';
import { uploadSharedAttachment } from '@/src/services/stage5Sync';
import { useAppData } from '@/src/state/AppDataProvider';
import { useAuth } from '@/src/state/AuthProvider';
import type { Attachment, AttachmentKind, AttachmentTargetType } from '@/src/types/models';

export function AttachmentsSection({
  targetType,
  targetId,
  eventId,
  parentVisibility,
  preferredKind = 'receipt',
  title = 'Attachments',
}: {
  targetType: AttachmentTargetType;
  targetId: string;
  eventId?: string | null;
  parentVisibility?: string | null;
  preferredKind?: AttachmentKind;
  title?: string;
}) {
  const data = useAppData();
  const auth = useAuth();
  const attachments = useMemo(
    () => activeAttachmentsForTarget(data.attachments, targetType, targetId),
    [data.attachments, targetId, targetType],
  );
  const defaultVisibility = inferAttachmentVisibility(parentVisibility);
  const [uri, setUri] = useState('');
  const [fileName, setFileName] = useState('');
  const [kind, setKind] = useState<AttachmentKind>(preferredKind);
  const [visibility, setVisibility] = useState(defaultVisibility);

  async function addAttachment() {
    const cleanUri = uri.trim();
    const cleanName = fileName.trim() || fileNameFromUri(cleanUri, `${kind}-attachment`);
    if (!cleanUri && !cleanName) {
      return;
    }
    if (visibility === 'shared' && !auth.identity.authenticatedUserId) {
      Alert.alert('Account required', 'Shared attachments require sign-in. Keep it private or sign in first.');
      return;
    }
    const info = cleanUri ? await fileInfo(cleanUri) : { exists: false, size: 0 };
    const storagePath =
      visibility === 'shared'
        ? storagePathForAttachment({ eventId, targetType, targetId, fileName: cleanName })
        : null;
    const attachment = await data.createAttachment({
      targetType,
      targetId,
      eventId,
      createdByUserId: auth.identity.authenticatedUserId,
      localUri: cleanUri || null,
      fileName: cleanName,
      mimeType: mimeFromName(cleanName),
      fileSize: 'size' in info ? info.size ?? 0 : 0,
      attachmentKind: kind,
      visibility,
      storagePath,
      syncStatus: visibility === 'shared' ? 'pending_upload' : 'local_only',
    });
    if (visibility === 'shared' && data.settings.attachmentUploadPreference === 'shared_only' && cleanUri) {
      try {
        const remote = await uploadSharedAttachment(attachment);
        if (remote) {
          await data.upsertAttachment({ ...attachment, ...remote, syncStatus: 'synced', updatedAt: new Date().toISOString() });
        }
      } catch {
        await data.upsertAttachment({ ...attachment, syncStatus: 'sync_error', updatedAt: new Date().toISOString() });
      }
    }
    setUri('');
    setFileName('');
  }

  return (
    <Card>
      <SectionTitle title={title} subtitle="Optional receipt, proof, screenshot, invoice, or supporting file references." />
      <View style={styles.badgeLine}>
        <Badge label={`${attachments.length} files`} tone={attachments.length ? 'blue' : 'neutral'} />
        {attachments.some((attachment) => attachment.attachmentKind === 'receipt') ? <Badge label="Receipt attached" tone="positive" /> : null}
        {attachments.some((attachment) => attachment.attachmentKind === 'proof') ? <Badge label="Proof attached" tone="positive" /> : null}
      </View>
      {attachments.length ? (
        attachments.map((attachment) => (
          <AttachmentRow
            key={attachment.id}
            attachment={attachment}
            onArchive={() =>
              Alert.alert('Remove attachment?', 'The file reference will be archived but parent records stay unchanged.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: () => data.archiveAttachment(attachment.id, auth.identity.authenticatedUserId) },
              ])
            }
          />
        ))
      ) : (
        <EmptyState title="No attachments" body="Attach a lightweight receipt or proof reference when it helps explain a record." />
      )}

      <View style={styles.addBox}>
        <TextField label="File URI" value={uri} onChangeText={setUri} placeholder="file:///... or image URI" />
        <TextField label="File name" value={fileName} onChangeText={setFileName} placeholder="receipt.jpg" />
        <SelectChips
          label="Attachment type"
          value={kind}
          options={[
            { label: 'Receipt', value: 'receipt' },
            { label: 'Proof', value: 'proof' },
            { label: 'Screenshot', value: 'screenshot' },
            { label: 'Invoice', value: 'invoice' },
            { label: 'Other', value: 'other' },
          ]}
          onChange={setKind}
        />
        <SelectChips
          label="Visibility"
          value={visibility}
          options={[
            { label: 'Private', value: 'private' },
            { label: 'Shared', value: 'shared' },
          ]}
          onChange={setVisibility}
        />
        <Button title="Add attachment" icon="attach" onPress={addAttachment} disabled={!uri.trim() && !fileName.trim()} />
      </View>
    </Card>
  );
}

function AttachmentRow({ attachment, onArchive }: { attachment: Attachment; onArchive: () => void }) {
  const previewUri = attachment.thumbnailUri ?? attachment.localUri ?? attachment.remoteUrl;
  const isImage = attachment.mimeType.startsWith('image/') && previewUri;
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/attachment/[id]', params: { id: attachment.id } })}
      style={styles.attachmentRow}>
      {isImage ? (
        <Image source={{ uri: previewUri }} style={styles.thumbnail} />
      ) : (
        <View style={styles.fileIcon}>
          <Ionicons name="document-attach" size={20} color={palette.brand} />
        </View>
      )}
      <View style={styles.flexOne}>
        <View style={styles.badgeLine}>
          <Text style={styles.fileName}>{attachment.fileName}</Text>
          <Badge label={ATTACHMENT_KIND_LABELS[attachment.attachmentKind]} tone={attachment.attachmentKind === 'receipt' ? 'positive' : 'blue'} />
          <Badge label={attachment.visibility} tone={attachment.visibility === 'shared' ? 'amber' : 'neutral'} />
        </View>
        <Text style={styles.meta}>
          {attachment.mimeType} · {formatFileSize(attachment.fileSize)} · {attachment.syncStatus.replaceAll('_', ' ')}
        </Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Remove attachment" onPress={onArchive} style={styles.removeButton}>
        <Ionicons name="trash-outline" size={18} color={palette.negative} />
      </Pressable>
    </Pressable>
  );
}

async function fileInfo(uri: string) {
  try {
    return await FileSystem.getInfoAsync(uri);
  } catch {
    return { exists: false, size: 0 };
  }
}

function mimeFromName(fileName: string) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.png')) {
    return 'image/png';
  }
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
    return 'image/jpeg';
  }
  if (lower.endsWith('.pdf')) {
    return 'application/pdf';
  }
  return 'application/octet-stream';
}

const styles = StyleSheet.create({
  badgeLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
  },
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  thumbnail: {
    width: 54,
    height: 54,
    borderRadius: radii.md,
    backgroundColor: palette.surfaceAlt,
  },
  fileIcon: {
    width: 54,
    height: 54,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surfaceAlt,
  },
  flexOne: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  fileName: {
    color: palette.ink,
    fontSize: typography.size.base,
    fontWeight: '800',
  },
  meta: {
    color: palette.muted,
    fontSize: typography.size.sm,
    fontWeight: '700',
  },
  removeButton: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.negativeSoft,
  },
  addBox: {
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
});
