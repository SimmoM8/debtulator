import React, { useCallback, useEffect, useState } from "react";
import { Alert, StyleSheet, Switch, Text, View } from "react-native";

import { DebtulatorShieldIllustration } from "@/src/components/illustrations/DebtulatorShieldIllustration";
import {
    Button,
    Card,
    PageHeader,
    Screen,
    SectionTitle,
    TextField,
} from "@/src/components/ui/Primitives";
import { palette, spacing, typefaces,
typography,
} from "@/src/constants/design";
import {
  type AccountDeletionRequest,
  fetchLatestAccountDeletionRequest,
  requestRemoteAccountDeletion,
} from "@/src/services/accountDeletion";
import { useAppData } from "@/src/state/AppDataProvider";
import { useAuth } from "@/src/state/AuthProvider";

export function DeleteAccountScreen() {
  const data = useAppData();
  const auth = useAuth();
  const [confirmation, setConfirmation] = useState("");
  const [deleteLocalData, setDeleteLocalData] = useState(false);
  const [keepLocalArchive, setKeepLocalArchive] = useState(true);
  const [remoteRequest, setRemoteRequest] = useState<AccountDeletionRequest | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const canRequest = confirmation.trim().toUpperCase() === "DELETE";
  const authenticatedUserId = auth.identity.authenticatedUserId;

  const refreshRemoteStatus = useCallback(async () => {
    if (!authenticatedUserId) {
      setRemoteRequest(null);
      setStatusError(null);
      return;
    }

    try {
      setStatusError(null);
      setRemoteRequest(await fetchLatestAccountDeletionRequest(authenticatedUserId));
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : "Unable to load deletion status.");
    }
  }, [authenticatedUserId]);

  useEffect(() => {
    void refreshRemoteStatus();
  }, [refreshRemoteStatus]);

  function requestDeletion() {
    if (!canRequest) {
      Alert.alert(
        "Confirmation required",
        "Type DELETE to request account deletion.",
      );
      return;
    }
    Alert.alert(
      "Request account deletion?",
      "Remote personal data, push tokens, and future notifications should be revoked. Shared financial history may be anonymized instead of destroyed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Submit request",
          style: "destructive",
          onPress: async () => {
            setSubmitting(true);
            try {
              const remote = authenticatedUserId
                ? await requestRemoteAccountDeletion({
                    deleteLocalData,
                    keepLocalArchive,
                    metadata: { source: "delete-account-screen" },
                  })
                : null;

              await data.createAuditLog({
                actorUserId: authenticatedUserId,
                action: remote ? "account_deletion_remote_requested" : "account_deletion_requested",
                targetType: "account",
                targetId: authenticatedUserId,
                eventId: null,
                metadata: {
                  deleteLocalData,
                  keepLocalArchive,
                  remoteRequestId: remote?.id ?? null,
                  remoteStatus: remote?.status ?? null,
                },
              });

              if (remote) {
                setRemoteRequest(remote);
              }
              if (deleteLocalData && !keepLocalArchive) {
                await data.resetLocalData(false);
              }
              Alert.alert(
                "Deletion request recorded",
                remote
                  ? `Remote status: ${formatStatus(remote.status)}.`
                  : "This device recorded the request locally. Sign in with Supabase configured to submit a backend deletion request.",
              );
            } catch (error) {
              Alert.alert(
                "Could not submit request",
                error instanceof Error ? error.message : "The deletion request could not be submitted.",
              );
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  }

  return (
    <Screen>
      <PageHeader
        eyebrow="Destructive action"
        title="Delete account"
        subtitle="Deletion is deliberate and preserves shared ledger integrity where required."
      />

      <Card tone="lavender" style={styles.heroCard}>
        <View style={styles.heroGlow} />
        <View style={styles.heroTop}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroLabel}>Final step</Text>
            <Text style={styles.heroTitle}>
              Make destructive actions explicit, reviewable, and hard to trigger
              by accident.
            </Text>
            <Text style={styles.body}>
              Debtulator protects shared ledger integrity even when personal
              profile data, device state, and notifications are being removed.
            </Text>
          </View>
          <View style={styles.heroArtWrap}>
            <DebtulatorShieldIllustration width={132} height={104} />
          </View>
        </View>
      </Card>

      <Card tone="amber">
        <SectionTitle
          title="Before deletion"
          subtitle="Export your data first if you need a copy."
        />
        <Text style={styles.body}>
          Personal profile data, push tokens, notification schedules, and
          account backup records should be removed or anonymized. Shared event
          financial records used by other participants are preserved in a
          privacy-conscious form so ledgers do not break.
        </Text>
      </Card>

      <Card>
        <SectionTitle title="Backend request status" />
        <Text style={styles.body}>
          {authenticatedUserId
            ? remoteRequest
              ? `Status: ${formatStatus(remoteRequest.status)}. Anonymization: ${formatStatus(remoteRequest.anonymizationStatus)}. Requested ${formatDate(remoteRequest.requestedAt)}.`
              : "No remote deletion request has been submitted for this signed-in account."
            : "Sign in to submit and track a backend account deletion request."}
        </Text>
        {statusError ? <Text style={styles.errorText}>{statusError}</Text> : null}
        {authenticatedUserId ? (
          <Button
            title="Refresh status"
            icon="refresh"
            variant="secondary"
            onPress={refreshRemoteStatus}
          />
        ) : null}
      </Card>

      <Card>
        <SectionTitle title="Local data choice" />
        <ToggleRow
          title="Keep local-only archive on this device"
          value={keepLocalArchive}
          onValueChange={setKeepLocalArchive}
        />
        <ToggleRow
          title="Delete local data too"
          value={deleteLocalData}
          onValueChange={setDeleteLocalData}
        />
        <TextField
          label="Type DELETE to continue"
          value={confirmation}
          onChangeText={setConfirmation}
        />
        <Button
          title={submitting ? "Submitting request" : "Request account deletion"}
          icon="trash"
          variant="danger"
          disabled={!canRequest || submitting}
          onPress={requestDeletion}
        />
      </Card>
    </Screen>
  );
}

function ToggleRow({
  title,
  value,
  onValueChange,
}: {
  title: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.switchRow}>
      <Text style={styles.title}>{title}</Text>
      <Switch
        accessibilityRole="switch"
        accessibilityLabel={title}
        accessibilityState={{ checked: value }}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: palette.lineStrong, true: palette.brandSoft }}
        thumbColor={value ? palette.brand : "#FFFFFF"}
      />
    </View>
  );
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

const styles = StyleSheet.create({
  heroCard: {
    overflow: "hidden",
  },
  heroGlow: {
    position: "absolute",
    top: -28,
    right: -10,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: "rgba(221,214,254,0.24)",
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.lg,
    flexWrap: "wrap",
  },
  heroCopy: {
    flex: 1,
    minWidth: 220,
    gap: spacing.sm,
  },
  heroLabel: {
    color: palette.muted,
    fontSize: typography.size.sm,
    fontFamily: typefaces.bodyStrong,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  heroTitle: {
    color: palette.ink,
    fontSize: typography.size.h1,
    lineHeight: typography.line.displayMd,
    fontFamily: typefaces.displayMedium,
  },
  heroArtWrap: {
    width: 142,
    height: 112,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.38)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderGlass,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    color: palette.muted,
    fontSize: typography.size.md,
    lineHeight: typography.line.lgPlus,
    fontFamily: typefaces.body,
  },
  switchRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.lg,
    justifyContent: "space-between",
  },
  title: {
    color: palette.ink,
    fontSize: typography.size.lg,
    fontFamily: typefaces.bodyHeavy,
  },
  errorText: {
    color: palette.danger,
    fontSize: typography.size.sm,
    lineHeight: typography.line.md,
    fontFamily: typefaces.bodyStrong,
  },
});
