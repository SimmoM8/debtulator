import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/src/components/ui/Badges';
import { Button, Card, EmptyState, SectionTitle, SelectChips, TextField } from '@/src/components/ui/Primitives';
import { palette, radii, spacing,
typography,
} from '@/src/constants/design';
import { useAppData } from '@/src/state/AppDataProvider';
import { useAuth } from '@/src/state/AuthProvider';
import type { Comment, CommentTargetType, CommentVisibility } from '@/src/types/models';

export function CommentsSection({
  targetType,
  targetId,
  groupId,
  sharedAvailable,
}: {
  targetType: CommentTargetType;
  targetId: string;
  groupId?: string | null;
  sharedAvailable?: boolean;
}) {
  const data = useAppData();
  const auth = useAuth();
  const comments = useMemo(
    () =>
      data.comments.filter(
        (comment) => comment.targetType === targetType && comment.targetId === targetId && !comment.deletedAt,
      ),
    [data.comments, targetId, targetType],
  );
  const [body, setBody] = useState('');
  const [visibility, setVisibility] = useState<CommentVisibility>(sharedAvailable ? 'shared' : 'private');

  async function addComment() {
    if (!body.trim()) {
      return;
    }
    if (visibility === 'shared' && !auth.identity.authenticatedUserId) {
      Alert.alert('Account required', 'Shared comments require sign-in. Choose private or sign in first.');
      return;
    }
    await data.createComment({
      targetType,
      targetId,
      groupId,
      authorUserId: visibility === 'shared' ? auth.identity.authenticatedUserId : null,
      localAuthorLabel: auth.identity.displayName || 'You',
      body,
      visibility,
    });
    setBody('');
  }

  return (
    <Card>
      <SectionTitle title="Comments" subtitle="Comments explain context but never affect balances." />
      {comments.length > 0 ? (
        comments.map((comment) => (
          <CommentRow key={comment.id} comment={comment} currentUserId={auth.identity.authenticatedUserId} />
        ))
      ) : (
        <EmptyState title="No comments" body="Add a short private note or shared clarification." />
      )}
      <TextField label="Add comment" value={body} onChangeText={setBody} placeholder="Clarify a split or note a dispute" multiline />
      <SelectChips
        label="Visibility"
        value={visibility}
        options={[
          { label: 'Private', value: 'private' },
          ...(sharedAvailable ? [{ label: 'Shared', value: 'shared' as CommentVisibility }] : []),
        ]}
        onChange={setVisibility}
      />
      <Button title="Add comment" icon="chatbubble" onPress={addComment} disabled={!body.trim()} />
    </Card>
  );
}

function CommentRow({ comment, currentUserId }: { comment: Comment; currentUserId: string | null }) {
  const data = useAppData();
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(comment.body);
  const owned = !comment.authorUserId || comment.authorUserId === currentUserId;

  return (
    <View style={styles.commentRow}>
      <View style={styles.commentTop}>
        <View style={styles.badgeLine}>
          <Text style={styles.author}>{comment.localAuthorLabel ?? comment.authorUserId ?? 'Local user'}</Text>
          <Badge label={comment.visibility} tone={comment.visibility === 'shared' ? 'blue' : 'neutral'} />
        </View>
        <Text style={styles.dateText}>{new Date(comment.createdAt).toLocaleString()}</Text>
      </View>
      {editing ? (
        <>
          <TextField label="Edit comment" value={body} onChangeText={setBody} multiline />
          <View style={styles.actionRow}>
            <Button
              title="Save"
              icon="save"
              onPress={async () => {
                await data.updateComment(comment.id, { body });
                setEditing(false);
              }}
              disabled={!body.trim()}
            />
            <Button title="Cancel" icon="close" variant="secondary" onPress={() => setEditing(false)} />
          </View>
        </>
      ) : (
        <Text style={styles.body}>{comment.body}</Text>
      )}
      {owned && !editing ? (
        <View style={styles.actionRow}>
          <Pressable accessibilityRole="button" onPress={() => setEditing(true)} style={styles.inlineAction}>
            <Text style={styles.inlineActionText}>Edit</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              Alert.alert('Delete comment?', 'Synced comments are soft-deleted so history can remain consistent.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => data.deleteComment(comment.id, currentUserId) },
              ])
            }
            style={styles.inlineAction}>
            <Text style={[styles.inlineActionText, styles.dangerText]}>Delete</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  commentRow: {
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  commentTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  badgeLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
  },
  author: {
    color: palette.ink,
    fontSize: typography.size.base,
    fontWeight: '900',
  },
  body: {
    color: palette.ink,
    fontSize: typography.size.base,
    lineHeight: typography.line.xl,
  },
  dateText: {
    color: palette.faint,
    fontSize: typography.size.sm,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  inlineAction: {
    minHeight: 34,
    justifyContent: 'center',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    backgroundColor: palette.surfaceAlt,
  },
  inlineActionText: {
    color: palette.brand,
    fontSize: typography.size.md,
    fontWeight: '800',
  },
  dangerText: {
    color: palette.negative,
  },
});
