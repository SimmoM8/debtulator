import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
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
  isSupportedAttachmentFile,
  MAX_ATTACHMENT_FILE_SIZE_BYTES,
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
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState(0);
  const [kind, setKind] = useState<AttachmentKind>(preferredKind);
  const [visibility, setVisibility] = useState(defaultVisibility);

  function setSelectedFile(next: { uri: string; fileName: string; mimeType?: string | null; fileSize?: number | null }) {
    setUri(next.uri);
    setFileName(next.fileName);
    setMimeType(next.mimeType ?? null);
    setFileSize(next.fileSize ?? 0);
  }

  async function pickDocument() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) {
        return;
      }
      const asset = result.assets[0];
      if (!asset) {
        Alert.alert('No file selected', 'Choose an image or PDF attachment to continue.');
        return;
      }
      if (!isSupportedAttachmentFile({ fileName: asset.name, mimeType: asset.mimeType })) {
        Alert.alert('Unsupported file type', 'Only images and PDF files are supported for attachments.');
        return;
      }
      setSelectedFile({
        uri: asset.uri,
        fileName: asset.name || fileNameFromUri(asset.uri, `${kind}-attachment`),
        mimeType: asset.mimeType,
        fileSize: asset.size,
      });
    } catch {
      Alert.alert('Could not open picker', 'Please try selecting an attachment again.');
    }
  }

  async function pickImage() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission required', 'Allow photo library access to pick an image attachment.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
      });
      if (result.canceled) {
        return;
      }
      const asset = result.assets[0];
      if (!asset) {
        Alert.alert('No image selected', 'Choose an image attachment to continue.');
        return;
      }
      if (!isSupportedAttachmentFile({ fileName: asset.fileName, mimeType: asset.mimeType })) {
        Alert.alert('Unsupported file type', 'Only images and PDF files are supported for attachments.');
        return;
      }
      setSelectedFile({
        uri: asset.uri,
        fileName: asset.fileName || fileNameFromUri(asset.uri, `${kind}-attachment`),
        mimeType: asset.mimeType,
        fileSize: asset.fileSize,
      });
    } catch {
      Alert.alert('Could not open image picker', 'Please try selecting an image again.');
    }
  }

  async function addAttachment() {
    const cleanUri = uri.trim();
    const cleanName = fileName.trim() || fileNameFromUri(cleanUri, `${kind}-attachment`);
    if (!cleanUri) {
      return;
    }
    if (!isSupportedAttachmentFile({ fileName: cleanName, mimeType })) {
      Alert.alert('Unsupported file type', 'Only images and PDF files are supported for attachments.');
      return;
    }
    if (visibility === 'shared' && !auth.identity.authenticatedUserId) {
      Alert.alert('Account required', 'Shared attachments require sign-in. Keep it private or sign in first.');
      return;
    }
    const info = cleanUri ? await fileInfo(cleanUri) : { exists: false, size: 0 };
    if (!info.exists) {
      Alert.alert('File unavailable', 'The selected file is no longer available. Please pick it again.');
      return;
    }
    const resolvedSize = fileSize || ('size' in info ? info.size ?? 0 : 0);
    if (resolvedSize > MAX_ATTACHMENT_FILE_SIZE_BYTES) {
      Alert.alert('Attachment too large', 'Please choose an attachment smaller than 10 MB.');
      return;
    }
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
      mimeType: mimeType || mimeFromName(cleanName),
      fileSize: resolvedSize,
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
    setMimeType(null);
    setFileSize(0);
  }

  return (
    <Card>
      <SectionTitle title={title} subtitle="Optional receipt, proof, screenshot, invoice, or supporting files from your device." />
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
        <View style={styles.buttonRow}>
          <Button title="Pick file" icon="document-attach" variant="secondary" onPress={pickDocument} />
          <Button title="Pick image" icon="image" variant="secondary" onPress={pickImage} />
        </View>
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
        <Button title="Add attachment" icon="attach" onPress={addAttachment} disabled={!uri.trim()} />
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
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
