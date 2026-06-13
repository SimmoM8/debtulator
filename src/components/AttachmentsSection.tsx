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
  MAX_ATTACHMENT_BYTES,
  activeAttachmentsForTarget,
  fileNameFromUri,
  formatFileSize,
  inferFileType,
  inferMimeType,
  inferAttachmentVisibility,
  storagePathForAttachment,
  validateAttachmentCandidate,
} from '@/src/services/attachments';
import { uploadSharedAttachment } from '@/src/services/stage5Sync';
import { useAppData } from '@/src/state/AppDataProvider';
import { useAuth } from '@/src/state/AuthProvider';
import type { Attachment, AttachmentKind, AttachmentTargetType } from '@/src/types/models';

type PickedAttachment = {
  uri: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  source: 'document' | 'photo';
};

export function AttachmentsSection({
  targetType,
  targetId,
  groupId,
  parentVisibility,
  preferredKind = 'receipt',
  title = 'Attachments',
}: {
  targetType: AttachmentTargetType;
  targetId: string;
  groupId?: string | null;
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
  const [selectedFile, setSelectedFile] = useState<PickedAttachment | null>(null);
  const [fileName, setFileName] = useState('');
  const [kind, setKind] = useState<AttachmentKind>(preferredKind);
  const [visibility, setVisibility] = useState(defaultVisibility);
  const attachmentValidation = useMemo(
    () =>
      selectedFile
        ? validateAttachmentCandidate({
            fileName: fileName.trim() || selectedFile.fileName,
            mimeType: selectedFile.mimeType,
            fileSize: selectedFile.fileSize,
          })
        : null,
    [fileName, selectedFile],
  );

  async function addAttachment() {
    if (!selectedFile) {
      return;
    }
    const cleanName = fileName.trim() || selectedFile.fileName;
    const validation = validateAttachmentCandidate({
      fileName: cleanName,
      mimeType: selectedFile.mimeType,
      fileSize: selectedFile.fileSize,
    });
    if (!validation.valid) {
      Alert.alert('Attachment not added', validation.errors.join('\n'));
      return;
    }
    if (visibility === 'shared' && !auth.identity.authenticatedUserId) {
      Alert.alert('Account required', 'Shared attachments require sign-in. Keep it private or sign in first.');
      return;
    }
    const storagePath =
      visibility === 'shared'
        ? storagePathForAttachment({ groupId, targetType, targetId, fileName: cleanName })
        : null;
    const attachment = await data.createAttachment({
      targetType,
      targetId,
      groupId,
      createdByUserId: auth.identity.authenticatedUserId,
      localUri: selectedFile.uri,
      fileName: cleanName,
      fileType: inferFileType(validation.mimeType, cleanName),
      mimeType: validation.mimeType,
      fileSize: validation.fileSize,
      attachmentKind: kind,
      visibility,
      storagePath,
      syncStatus: visibility === 'shared' ? 'pending_upload' : 'local_only',
    });
    if (
      visibility === 'shared' &&
      (data.settings.uploadAttachmentsForSharedRecords || data.settings.attachmentUploadPreference === 'shared_only')
    ) {
      try {
        const remote = await uploadSharedAttachment(attachment);
        if (remote) {
          await data.upsertAttachment({ ...attachment, ...remote, syncStatus: 'synced', updatedAt: new Date().toISOString() });
        }
      } catch {
        await data.upsertAttachment({ ...attachment, syncStatus: 'sync_error', updatedAt: new Date().toISOString() });
      }
    }
    setSelectedFile(null);
    setFileName('');
    Alert.alert(
      'Attachment added',
      validation.warnings.length
        ? validation.warnings.join('\n')
        : `${cleanName} was saved as a ${visibility} attachment reference.`,
    );
  }

  async function pickDocument() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*', 'text/csv', 'text/plain'],
        copyToCacheDirectory: true,
        multiple: false,
        base64: false,
      });
      if (result.canceled) {
        return;
      }
      const asset = result.assets[0];
      if (!asset) {
        return;
      }
      await setPickedFile({
        uri: asset.uri,
        fileName: asset.name || fileNameFromUri(asset.uri, `${kind}-attachment`),
        mimeType: asset.mimeType ?? inferMimeType(asset.name || asset.uri),
        fileSize: asset.size ?? 0,
        source: 'document',
      });
    } catch {
      Alert.alert('Could not open files', 'The native document picker was not able to return a file.');
    }
  }

  async function pickImage() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Photo access needed', 'Allow photo library access to attach a receipt or proof image.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        quality: 1,
      });
      if (result.canceled) {
        return;
      }
      const asset = result.assets[0];
      if (!asset) {
        return;
      }
      const fallbackName = fileNameFromUri(asset.uri, `${kind}-image.jpg`);
      await setPickedFile({
        uri: asset.uri,
        fileName: asset.fileName || fallbackName,
        mimeType: asset.mimeType ?? inferMimeType(asset.fileName || fallbackName, 'image/jpeg'),
        fileSize: asset.fileSize ?? 0,
        source: 'photo',
      });
    } catch {
      Alert.alert('Could not open photos', 'The native image picker was not able to return an image.');
    }
  }

  async function setPickedFile(file: PickedAttachment) {
    const info = file.fileSize > 0 ? null : await fileInfo(file.uri);
    const fileWithSize = {
      ...file,
      fileSize: file.fileSize || (info && 'size' in info && info.size ? info.size : 0),
    };
    const validation = validateAttachmentCandidate(fileWithSize);
    setSelectedFile(fileWithSize);
    setFileName(fileWithSize.fileName);
    if (!validation.valid) {
      Alert.alert('Unsupported attachment', validation.errors.join('\n'));
    }
  }

  return (
    <Card>
      <SectionTitle
        title={title}
        subtitle={`Pick a receipt, proof, screenshot, invoice, CSV, or note up to ${formatFileSize(MAX_ATTACHMENT_BYTES)}.`}
      />
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
        <View style={styles.pickerActions}>
          <Button title="Pick document" icon="document-attach" variant="secondary" onPress={pickDocument} />
          <Button title="Pick image" icon="image" variant="secondary" onPress={pickImage} />
        </View>
        {selectedFile ? (
          <View style={styles.selectedFile}>
            <View style={styles.fileIcon}>
              <Ionicons
                name={selectedFile.mimeType.startsWith('image/') ? 'image' : 'document-attach'}
                size={20}
                color={palette.brand}
              />
            </View>
            <View style={styles.flexOne}>
              <Text style={styles.fileName}>{fileName || selectedFile.fileName}</Text>
              <Text style={styles.meta}>
                {selectedFile.source === 'photo' ? 'Photo library' : 'Document picker'} · {selectedFile.mimeType} ·{' '}
                {formatFileSize(selectedFile.fileSize)}
              </Text>
              {attachmentValidation?.errors.map((error) => (
                <Text key={error} style={styles.errorText}>
                  {error}
                </Text>
              ))}
              {attachmentValidation?.warnings.map((warning) => (
                <Text key={warning} style={styles.warningText}>
                  {warning}
                </Text>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.selectedFile}>
            <View style={styles.fileIcon}>
              <Ionicons name="attach" size={20} color={palette.muted} />
            </View>
            <View style={styles.flexOne}>
              <Text style={styles.fileName}>No file selected</Text>
              <Text style={styles.meta}>Use the native picker before adding an attachment.</Text>
            </View>
          </View>
        )}
        <TextField label="Display name" value={fileName} onChangeText={setFileName} placeholder="receipt.jpg" />
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
        <Button
          title="Add attachment"
          icon="attach"
          onPress={addAttachment}
          disabled={!selectedFile || Boolean(attachmentValidation?.errors.length)}
        />
      </View>
    </Card>
  );
}

function AttachmentRow({ attachment, onArchive }: { attachment: Attachment; onArchive: () => void }) {
  const previewUri = attachment.thumbnailUri ?? attachment.localUri ?? attachment.remoteUrl;
  const isImage = attachment.mimeType.startsWith('image/') && previewUri;
  return (
    <View style={styles.attachmentRow}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open attachment ${attachment.fileName}`}
        onPress={() => router.push({ pathname: '/attachment/[id]', params: { id: attachment.id } })}
        style={({ pressed }) => [styles.attachmentMain, pressed && styles.pressed]}
      >
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
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Remove attachment" onPress={onArchive} style={styles.removeButton}>
        <Ionicons name="trash-outline" size={18} color={palette.negative} />
      </Pressable>
    </View>
  );
}

async function fileInfo(uri: string) {
  try {
    return await FileSystem.getInfoAsync(uri);
  } catch {
    return { exists: false, size: 0 };
  }
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
  attachmentMain: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radii.md,
  },
  pressed: {
    opacity: 0.72,
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
  pickerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  selectedFile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.line,
    borderRadius: radii.md,
    padding: spacing.md,
    backgroundColor: palette.surfaceAlt,
  },
  warningText: {
    color: palette.amber,
    fontSize: typography.size.sm,
    fontWeight: '700',
  },
  errorText: {
    color: palette.negative,
    fontSize: typography.size.sm,
    fontWeight: '700',
  },
});
