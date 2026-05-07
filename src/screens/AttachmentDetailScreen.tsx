import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/src/components/ui/Badges';
import { Button, Card, EmptyState, LoadingState, PageHeader, Screen, SectionTitle } from '@/src/components/ui/Primitives';
import { palette, spacing } from '@/src/constants/design';
import { ATTACHMENT_KIND_LABELS, ATTACHMENT_TARGET_LABELS, formatFileSize } from '@/src/services/attachments';
import { useAppData } from '@/src/state/AppDataProvider';
import { useAuth } from '@/src/state/AuthProvider';

export function AttachmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useAppData();
  const auth = useAuth();
  const attachment = data.attachments.find((item) => item.id === id);

  if (data.loading) {
    return <LoadingState />;
  }

  if (!attachment) {
    return (
      <Screen>
        <EmptyState title="Attachment not found" body="This attachment may have been archived or removed." />
      </Screen>
    );
  }

  const uri = attachment.localUri ?? attachment.remoteUrl ?? attachment.thumbnailUri;
  const isImage = Boolean(uri && attachment.mimeType.startsWith('image/'));

  return (
    <Screen>
      <PageHeader
        eyebrow={ATTACHMENT_TARGET_LABELS[attachment.targetType]}
        title={attachment.fileName}
        subtitle="Lightweight attachment metadata and preview."
      />

      <Card tone={attachment.attachmentKind === 'receipt' || attachment.attachmentKind === 'proof' ? 'mint' : 'blue'}>
        <View style={styles.badgeLine}>
          <Badge label={ATTACHMENT_KIND_LABELS[attachment.attachmentKind]} tone="positive" />
          <Badge label={attachment.visibility} tone={attachment.visibility === 'shared' ? 'amber' : 'neutral'} />
          <Badge label={attachment.syncStatus.replaceAll('_', ' ')} tone={attachment.syncStatus === 'synced' ? 'positive' : 'blue'} />
        </View>
        {isImage ? (
          <Image source={{ uri: uri! }} style={styles.preview} resizeMode="contain" />
        ) : (
          <View style={styles.filePreview}>
            <Text style={styles.filePreviewText}>{attachment.mimeType}</Text>
            <Text style={styles.body}>{uri ?? 'No local or remote file URI is available.'}</Text>
          </View>
        )}
      </Card>

      <Card>
        <SectionTitle title="Metadata" subtitle="Exports include references only unless attachments are explicitly selected." />
        <InfoRow label="Target" value={`${attachment.targetType.replaceAll('_', ' ')} · ${attachment.targetId}`} />
        <InfoRow label="Event" value={attachment.eventId ?? 'None'} />
        <InfoRow label="File type" value={attachment.fileType} />
        <InfoRow label="MIME" value={attachment.mimeType} />
        <InfoRow label="Size" value={formatFileSize(attachment.fileSize)} />
        <InfoRow label="Local URI" value={attachment.localUri ?? 'None'} />
        <InfoRow label="Storage path" value={attachment.storagePath ?? 'None'} />
        <InfoRow label="Remote URL" value={attachment.remoteUrl ? 'Signed/private URL cached' : 'None'} />
        <InfoRow label="Created" value={new Date(attachment.createdAt).toLocaleString()} />
        <InfoRow label="Updated" value={new Date(attachment.updatedAt).toLocaleString()} />
        {attachment.archivedAt ? <InfoRow label="Archived" value={new Date(attachment.archivedAt).toLocaleString()} /> : null}
        {!attachment.archivedAt ? (
          <Button title="Remove attachment" icon="trash" variant="danger" onPress={() => data.archiveAttachment(attachment.id, auth.identity.authenticatedUserId)} />
        ) : null}
      </Card>
    </Screen>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badgeLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  preview: {
    width: '100%',
    minHeight: 320,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  filePreview: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    padding: spacing.lg,
  },
  filePreviewText: {
    color: palette.ink,
    fontSize: 20,
    fontWeight: '900',
  },
  body: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  infoLabel: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  infoValue: {
    flex: 1,
    textAlign: 'right',
    color: palette.ink,
    fontSize: 13,
    fontWeight: '800',
  },
});
