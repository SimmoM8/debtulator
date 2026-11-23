import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { BackendClient } from "@/src/data/backend/BackendClient";
import { openDatabase } from "@/src/data/sqlite/openDatabase";
import { spacing, useAppTheme } from "@/src/theme";

import { BackendSyncGateway } from "./BackendSyncGateway";
import { SqliteSyncStore } from "./SqliteSyncStore";
import {
  canReviewDebtConflict,
  describeDebtValues,
  findServerDebt,
} from "./syncConflictResolution";
import type { SyncBootstrapItem, SyncMutation } from "./syncTypes";

type Props = {
  ownerUserId: string;
  backend: BackendClient | null;
  error: string | null;
  revision: number;
  onRetry: () => Promise<void>;
};

type QueueState = {
  pending: number;
  failedPending: number;
  blocked: SyncMutation[];
};

const EMPTY_QUEUE: QueueState = { pending: 0, failedPending: 0, blocked: [] };

export function SyncStatusPanel({ ownerUserId, backend, error, revision, onRetry }: Props) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const [queue, setQueue] = useState<QueueState>(EMPTY_QUEUE);
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<SyncMutation | null>(null);
  const [serverDebt, setServerDebt] = useState<SyncBootstrapItem | null>(null);
  const [loadingReview, setLoadingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const db = await openDatabase();
    const [counts, blocked] = await Promise.all([
      db.getFirstAsync<{ pending: number; failed_pending: number }>(
        `SELECT
           COUNT(*) AS pending,
           COALESCE(SUM(CASE WHEN attempt_count > 0 THEN 1 ELSE 0 END), 0) AS failed_pending
         FROM sync_outbox WHERE owner_user_id = ? AND status = 'pending'`,
        [ownerUserId],
      ),
      new SqliteSyncStore(db).getBlockingFailures(ownerUserId),
    ]);
    setQueue({
      pending: counts?.pending ?? 0,
      failedPending: counts?.failed_pending ?? 0,
      blocked,
    });
  }, [ownerUserId]);

  useEffect(() => {
    const refreshTimer = setTimeout(() => {
      void refresh().catch((failure: unknown) => {
        console.warn("Could not read the local sync queue", failure);
      });
    }, 0);

    return () => clearTimeout(refreshTimer);
  }, [refresh, revision]);

  async function review(mutation: SyncMutation) {
    setSelected(mutation);
    setServerDebt(null);
    setReviewError(null);
    if (!backend || !canReviewDebtConflict(mutation)) return;

    setLoadingReview(true);
    try {
      const remote = await findServerDebt(new BackendSyncGateway(backend), mutation.entityId);
      if (!remote || remote.payload.ownerUserId !== ownerUserId) {
        setReviewError("The server record is unavailable. Your local change is preserved; do not retry it automatically.");
        return;
      }
      setServerDebt(remote);
    } catch {
      setReviewError("Could not load the server version. Check your connection and review again.");
    } finally {
      setLoadingReview(false);
    }
  }

  async function retryWithLocalValues() {
    if (!selected || !serverDebt || !backend || !canReviewDebtConflict(selected)) return;

    setLoadingReview(true);
    try {
      // Re-read immediately before enabling the retry. A concurrent server edit
      // invalidates the review; the backend still enforces optimistic concurrency.
      const current = await findServerDebt(new BackendSyncGateway(backend), selected.entityId);
      if (!current || current.version !== serverDebt.version ||
          JSON.stringify(current.payload) !== JSON.stringify(serverDebt.payload)) {
        setReviewError("The server debt changed during review. Compare both versions again before deciding.");
        setServerDebt(null);
        return;
      }
      const db = await openDatabase();
      const retry = { requeued: false };
      await db.withExclusiveTransactionAsync(async (tx) => {
        retry.requeued = await new SqliteSyncStore(tx).requeueReviewedDebtConflict(
          ownerUserId,
          selected.id,
          current.version,
        );
      });
      if (!retry.requeued) {
        setReviewError("This change is no longer eligible for retry. Refresh and review the latest state.");
        return;
      }
      setSelected(null);
      await onRetry();
      await refresh();
    } catch {
      setReviewError("Could not retry the reviewed change. It remains saved locally.");
    } finally {
      setLoadingReview(false);
    }
  }

  function confirmUseLocal() {
    Alert.alert(
      "Use your local debt values?",
      "This will propose your local amount and details against the latest server version. It can replace a newer server edit in your private ledger. Linked members must still accept the new proposal. Continue only after comparing both versions.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Use my values", onPress: () => { void retryWithLocalValues(); } },
      ],
    );
  }

  const blockedCount = queue.blocked.length;
  const show = error !== null || queue.pending > 0 || blockedCount > 0;
  if (!show) return null;

  const status = blockedCount > 0
    ? `${blockedCount} change${blockedCount === 1 ? "" : "s"} need review`
    : error
      ? "Sync failed — changes may not be shared"
      : `${queue.pending} change${queue.pending === 1 ? "" : "s"} not yet synced`;

  return (
    <View style={[styles.container, { bottom: insets.bottom + 70 }]} pointerEvents="box-none">
      {expanded ? (
        <View style={[styles.details, { backgroundColor: theme.colors.surfaceContainer, borderColor: theme.colors.outline }]}>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            <Text style={[styles.heading, { color: theme.colors.text }]}>Sync status</Text>
            <Text style={{ color: theme.colors.secondaryText }}>
              {queue.pending} waiting to send. {blockedCount} need review. Changes remain on this device until the server accepts them. Do not delete the app or its data while changes are unsent.
            </Text>
            {error ? <Text style={[styles.note, { color: theme.colors.text }]}>{error}</Text> : null}
            {queue.failedPending > 0 ? (
              <Text style={{ color: theme.colors.text }}>
                {queue.failedPending} queued change(s) had a failed attempt and will retry.
              </Text>
            ) : null}
            {queue.blocked.map((item) => (
              <Pressable key={item.id} accessibilityRole="button" style={styles.item} onPress={() => { void review(item); }}>
                <Text style={[styles.itemTitle, { color: theme.colors.text }]}>
                  {item.entityType === "debt" ? "Debt" : "Member"} · {item.status}
                </Text>
                <Text style={{ color: theme.colors.secondaryText }}>
                  {item.lastError ?? "The server could not accept this change."}
                </Text>
                <Text style={{ color: theme.colors.text }}>Review saved change</Text>
              </Pressable>
            ))}
            {selected ? (
              <View style={[styles.review, { borderColor: theme.colors.outline }]}>
                <Text style={[styles.itemTitle, { color: theme.colors.text }]}>Saved locally (not sent)</Text>
                <Text selectable style={{ color: theme.colors.text }}>
                  {selected.entityType === "debt" && selected.payloadJson
                    ? describeSavedDebt(selected.payloadJson)
                    : selected.lastError ?? "This change requires attention."}
                </Text>
                {loadingReview ? <Text style={{ color: theme.colors.secondaryText }}>Checking server version…</Text> : null}
                {serverDebt ? (
                  <>
                    <Text style={[styles.itemTitle, { color: theme.colors.text }]}>Currently on server</Text>
                    <Text selectable style={{ color: theme.colors.text }}>
                      {describeDebtValues(serverDebt.payload)}
                    </Text>
                  </>
                ) : null}
                {reviewError ? <Text style={{ color: theme.colors.text }}>{reviewError}</Text> : null}
                {serverDebt && canReviewDebtConflict(selected) && !loadingReview ? (
                  <Pressable accessibilityRole="button" onPress={confirmUseLocal} style={styles.item}>
                    <Text style={{ color: theme.colors.text }}>Use my local values after review</Text>
                  </Pressable>
                ) : null}
                {!serverDebt && canReviewDebtConflict(selected) && !loadingReview ? (
                  <Pressable accessibilityRole="button" onPress={() => { void review(selected); }} style={styles.item}>
                    <Text style={{ color: theme.colors.text }}>Reload server version</Text>
                  </Pressable>
                ) : null}
                <Text style={{ color: theme.colors.secondaryText }}>
                  Other conflicts and rejected changes stay preserved for manual correction. Nothing is discarded automatically.
                </Text>
              </View>
            ) : null}
          </ScrollView>
        </View>
      ) : null}
      <View style={[styles.banner, { backgroundColor: theme.colors.surfaceContainer, borderColor: theme.colors.outline }]}>
        <Text accessibilityRole="alert" style={[styles.bannerText, { color: theme.colors.text }]}>{status}</Text>
        <Pressable accessibilityRole="button" onPress={() => { setExpanded(!expanded); setSelected(null); }}>
          <Text style={{ color: theme.colors.text }}>{expanded ? "Close" : "Review"}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => { void onRetry(); }}>
          <Text style={{ color: theme.colors.text }}>Retry</Text>
        </Pressable>
      </View>
    </View>
  );
}

function describeSavedDebt(payloadJson: string): string {
  try {
    const payload = JSON.parse(payloadJson) as unknown;
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return "The saved change cannot be displayed. It has not been discarded.";
    }
    return describeDebtValues(payload as Record<string, unknown>);
  } catch {
    return "The saved change cannot be displayed. It has not been discarded.";
  }
}

const styles = StyleSheet.create({
  container: { position: "absolute", left: spacing.sm, right: spacing.sm, zIndex: 100 },
  banner: { borderWidth: 1, borderRadius: 12, padding: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.md },
  bannerText: { flex: 1, fontWeight: "600" },
  details: { borderWidth: 1, borderRadius: 12, marginBottom: spacing.sm, maxHeight: 360 },
  scroll: { flexGrow: 0 },
  scrollContent: { padding: spacing.md, gap: spacing.md },
  heading: { fontSize: 18, fontWeight: "700" },
  note: { fontWeight: "600" },
  item: { padding: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, gap: spacing.xs },
  itemTitle: { fontWeight: "700" },
  review: { borderTopWidth: 1, paddingTop: spacing.md, gap: spacing.md },
});
