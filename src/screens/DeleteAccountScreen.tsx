import React, { useState } from "react";
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
import { useAppData } from "@/src/state/AppDataProvider";
import { useAuth } from "@/src/state/AuthProvider";

export function DeleteAccountScreen() {
  const data = useAppData();
  const auth = useAuth();
  const [confirmation, setConfirmation] = useState("");
  const [deleteLocalData, setDeleteLocalData] = useState(false);
  const [keepLocalArchive, setKeepLocalArchive] = useState(true);
  const canRequest = confirmation.trim().toUpperCase() === "DELETE";

  function requestDeletion() {
    if (!canRequest) {
      Alert.alert(
        "Confirmation required",
        "Type DELETE to record this deletion request.",
      );
      return;
    }
    Alert.alert(
      "Record account deletion request?",
      "This action records your request and applies the local-data option below. Actual remote deletion is not performed from this screen.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Record request",
          style: "destructive",
          onPress: async () => {
            await data.createAuditLog({
              actorUserId: auth.identity.authenticatedUserId,
              action: "account_deletion_requested",
              targetType: "account",
              targetId: auth.identity.authenticatedUserId,
              eventId: null,
              metadata: { deleteLocalData, keepLocalArchive },
            });
            if (deleteLocalData && !keepLocalArchive) {
              await data.resetLocalData(false);
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
        subtitle="Record a deletion request and choose what happens to local device data."
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
          subtitle="Export your data first if you need a copy of this device ledger."
        />
        <Text style={styles.body}>
          Use this flow to capture your deletion request and optionally clear
          local data on this device. Shared records for other participants are
          not edited by this request screen.
        </Text>
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
          title="Record deletion request"
          icon="trash"
          variant="danger"
          disabled={!canRequest}
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
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: palette.lineStrong, true: palette.brandSoft }}
        thumbColor={value ? palette.brand : "#FFFFFF"}
      />
    </View>
  );
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
});
