import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { DebtulatorOrbitIllustration } from "@/src/components/illustrations/DebtulatorOrbitIllustration";
import {
    Button,
    Card,
    LoadingState,
    PageHeader,
    Screen,
    TextField,
} from "@/src/components/ui/Primitives";
import { palette, spacing, typefaces } from "@/src/constants/design";
import { useAppData } from "@/src/state/AppDataProvider";

export function MemberFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const data = useAppData();
  const member = data.members.find((item) => item.id === id);

  const [displayName, setDisplayName] = useState(member?.displayName ?? "");
  const [notes, setNotes] = useState(member?.notes ?? "");
  const [email, setEmail] = useState(member?.email ?? "");
  const [phone, setPhone] = useState(member?.phone ?? "");
  const [tags, setTags] = useState(member?.tags.join(", ") ?? "");

  const tagHint = useMemo(
    () => data.tags.map((tag) => tag.name).join(", "),
    [data.tags],
  );

  if (data.loading) {
    return <LoadingState />;
  }

  async function save() {
    const input = {
      displayName,
      notes,
      email,
      phone,
      tags: splitTags(tags),
    };

    if (member) {
      await data.updateMember(member.id, input);
    } else {
      await data.createMember(input);
    }

    router.back();
  }

  return (
    <Screen
      footer={
        <Button
          title={member ? "Save member" : "Create member"}
          icon="checkmark"
          onPress={save}
          disabled={!displayName.trim()}
        />
      }
    >
      <PageHeader
        eyebrow="Member"
        title={member ? "Edit member" : "Add member"}
        subtitle="Add the person once, then use them across debts, events, payments, and settlements."
      />

      <Card tone="lavender" style={styles.heroCard}>
        <View style={styles.heroGlow} />
        <View style={styles.heroTop}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroLabel}>People first</Text>
            <Text style={styles.heroTitle}>
              Create a clear member identity before you attach balances,
              reminders, or shared-event roles to it.
            </Text>
            <Text style={styles.body}>
              Local member records can stay lightweight at first and become
              richer later without changing the ledger history they already
              anchor.
            </Text>
          </View>
          <View style={styles.heroArtWrap}>
            <DebtulatorOrbitIllustration width={132} height={104} compact />
          </View>
        </View>
      </Card>

      <Card tone="peach">
        <TextField
          label="Display name"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Daniel"
        />
        <TextField
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          placeholder="How you know them"
          multiline
        />
        <TextField
          label="Email placeholder"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />
        <TextField
          label="Phone placeholder"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <TextField
          label="Tags"
          value={tags}
          onChangeText={setTags}
          placeholder={tagHint || "Family, Friends, Travel"}
        />
      </Card>
    </Screen>
  );
}

function splitTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

const styles = StyleSheet.create({
  heroCard: {
    overflow: "hidden",
  },
  heroGlow: {
    position: "absolute",
    top: -24,
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
    fontSize: 12,
    fontFamily: typefaces.bodyStrong,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  heroTitle: {
    color: palette.ink,
    fontSize: 24,
    lineHeight: 32,
    fontFamily: typefaces.displayMedium,
  },
  body: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: typefaces.body,
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
});
