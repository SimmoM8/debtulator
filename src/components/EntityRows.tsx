import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
    Badge,
    LinkStatusBadge,
    StatusBadge,
    TagChips,
    VerificationBadge,
    VisibilityBadge,
} from "@/src/components/ui/Badges";
import { MemberAvatar } from "@/src/components/ui/MemberAvatar";
import { BalanceStack } from "@/src/components/ui/Money";
import {
    palette,
    radii,
    shadows,
    spacing,
    typefaces,
    typography,
} from "@/src/constants/design";
import { entryDirectionText } from "@/src/services/ledger";
import type {
    AppSettings,
    CurrencyRate,
    Group,
    LedgerEntry,
    Member,
    MoneyMap,
    SharedGroupMember,
} from "@/src/types/models";
import { formatMoney } from "@/src/utils/money";

export function MemberRow({
  member,
  balance,
  settings,
  currencyRates,
}: {
  member: Member;
  balance: MoneyMap;
  settings: AppSettings;
  currencyRates: CurrencyRate[];
}) {
  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: "/member/[id]", params: { id: member.id } })
      }
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.rowLead}>
        <Avatar label={member.displayName} />
      </View>
      <View style={styles.rowMain}>
        <View style={styles.rowHeader}>
          <View style={styles.rowTitleBlock}>
            <Text style={styles.rowTitle}>{member.displayName}</Text>
            {member.linkedProfileDisplayName ? (
              <Text style={styles.rowMeta}>
                Linked to {member.linkedProfileDisplayName}
              </Text>
            ) : null}
          </View>
          <LinkStatusBadge status={member.linkStatus} />
        </View>
        <TagChips tags={member.tags} limit={3} />
      </View>
      <BalanceStack
        balances={balance}
        settings={settings}
        currencyRates={currencyRates}
        align="right"
      />
    </Pressable>
  );
}

export function DebtRow({
  entry,
  members,
  sharedGroupMembers = [],
  group,
}: {
  entry: LedgerEntry;
  members: Member[];
  sharedGroupMembers?: SharedGroupMember[];
  group?: Group;
}) {
  const rejected =
    entry.verificationStatus === "rejected" ||
    entry.verificationStatus === "disputed";
  const member = [entry.fromId, entry.toId]
    .filter((participantId) => participantId !== "me")
    .map((participantId) => members.find((item) => item.id === participantId))
    .find(Boolean);
  const paymentTone =
    entry.paymentStatus === "paid"
      ? "positive"
      : entry.paymentStatus === "overpaid" ||
          entry.paymentStatus === "partially_paid"
        ? "amber"
        : "neutral";

  return (
    <Pressable
      onPress={() =>
        entry.kind === "simple_debt"
          ? router.push({
              pathname: "/debt/[id]",
              params: { id: entry.sourceId },
            })
          : entry.kind === "group_direct_debt" && entry.groupId
            ? router.push({
                pathname: "/group/[id]",
                params: { id: entry.groupId },
              })
            : router.push({
                pathname: "/expense/[id]",
                params: { id: entry.expenseId ?? entry.sourceId },
              })
      }
      style={({ pressed }) => [
        styles.ledgerRow,
        rejected && styles.rejectedRow,
        pressed && styles.rowPressed,
      ]}
    >
      <View style={styles.rowLead}>
        <View style={styles.rowIcon}>
          <Ionicons
            name={
              entry.kind === "simple_debt"
                ? "receipt-outline"
                : "git-network-outline"
            }
            size={18}
            color={palette.brand}
          />
        </View>
      </View>
      <View style={styles.rowMain}>
        <View style={styles.rowHeader}>
          <View style={styles.rowTitleBlock}>
            <Text style={styles.rowTitle}>{entry.title}</Text>
            <Text style={styles.rowSubtitle}>
              {entryDirectionText(entry, members, sharedGroupMembers)}
            </Text>
          </View>
          <Text style={styles.dateText}>{entry.date}</Text>
        </View>
        {group ? <Text style={styles.rowMeta}>{group.name}</Text> : null}
        <TagChips tags={entry.tags} limit={3} />
        <View style={styles.badgeLine}>
          <StatusBadge status={entry.status} />
          <VerificationBadge status={entry.verificationStatus} />
          <VisibilityBadge visibility={entry.visibility} />
          {member ? <LinkStatusBadge status={member.linkStatus} /> : null}
          <Badge
            label={entry.paymentStatus.replaceAll("_", " ")}
            tone={paymentTone}
          />
        </View>
      </View>
      <View style={styles.amountBlock}>
        <Text style={styles.amountText}>
          {formatMoney(entry.remainingAmount, entry.currency)}
        </Text>
        {entry.amountPaid > 0 ? (
          <Text style={styles.kindText}>
            paid {formatMoney(entry.amountPaid, entry.currency)}
          </Text>
        ) : null}
        {entry.dueDate ? (
          <Text style={styles.kindText}>due {entry.dueDate}</Text>
        ) : null}
        <Text style={styles.kindText}>
          {entry.kind === "simple_debt"
            ? "Debt"
            : entry.kind === "group_direct_debt"
              ? "Group debt"
              : "Split"}
        </Text>
      </View>
    </Pressable>
  );
}

export function GroupRow({
  group,
  memberCount,
  balance,
  settings,
  currencyRates,
  unsettled,
}: {
  group: Group;
  memberCount: number;
  balance: MoneyMap;
  settings: AppSettings;
  currencyRates: CurrencyRate[];
  unsettled: boolean;
}) {
  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: "/group/[id]", params: { id: group.id } })
      }
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.rowLead}>
        <View
          style={[styles.groupMark, unsettled ? styles.groupMarkHot : null]}
        >
          <Ionicons
            name="people"
            size={18}
            color={unsettled ? palette.warning : palette.brand}
          />
        </View>
      </View>
      <View style={styles.rowMain}>
        <View style={styles.rowHeader}>
          <View style={styles.rowTitleBlock}>
            <Text style={styles.rowTitle}>{group.name}</Text>
            <Text style={styles.rowSubtitle}>
              {memberCount} members · {group.defaultCurrency} ·{" "}
              {group.visibility === "shared" ? "Shared group" : "Private group"}
            </Text>
          </View>
          <StatusBadge status={group.status} />
        </View>
        <TagChips tags={group.tags} limit={3} />
      </View>
      <BalanceStack
        balances={balance}
        settings={settings}
        currencyRates={currencyRates}
        align="right"
      />
    </Pressable>
  );
}

function Avatar({ label }: { label: string }) {
  return <MemberAvatar name={label} size={52} style={styles.avatar} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderIndigoSoft,
    borderRadius: 24,
    backgroundColor: palette.surfaceWarm,
    ...shadows.card,
  },
  ledgerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderIndigoSoft,
    borderRadius: 24,
    backgroundColor: palette.surfaceWarm,
    ...shadows.card,
  },
  rowPressed: {
    opacity: 0.82,
  },
  rejectedRow: {
    backgroundColor: palette.negativeSoft,
    borderColor: "rgba(255,107,107,0.24)",
  },
  rowLead: {
    paddingTop: 2,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radii.pill,
    backgroundColor: "rgba(253,186,155,0.16)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(253,186,155,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  groupMark: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "rgba(221,214,254,0.16)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderIndigoSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  groupMarkHot: {
    backgroundColor: palette.amberSoft,
    borderColor: "rgba(245,158,11,0.28)",
  },
  rowIcon: {
    width: 52,
    height: 52,
    borderRadius: radii.pill,
    backgroundColor: "rgba(55,48,163,0.08)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderIndigoSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  rowMain: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  rowTitleBlock: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rowTitle: {
    color: palette.ink,
    fontSize: typography.size.xlPlus,
    fontFamily: typefaces.bodyHeavy,
  },
  rowSubtitle: {
    color: palette.muted,
    fontSize: typography.size.sm,
    lineHeight: typography.line.lg,
    fontFamily: typefaces.body,
  },
  rowMeta: {
    color: palette.brandDark,
    fontSize: typography.size.sm,
    fontFamily: typefaces.bodyStrong,
  },
  badgeLine: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  amountBlock: {
    alignItems: "flex-end",
    gap: 3,
    minWidth: 86,
    maxWidth: 118,
    paddingTop: 2,
  },
  amountText: {
    color: palette.ink,
    fontSize: typography.size.xxl,
    fontFamily: typefaces.bodyHeavy,
    fontVariant: ["tabular-nums"],
    textAlign: "right",
  },
  kindText: {
    color: palette.muted,
    fontSize: typography.size.xs,
    fontFamily: typefaces.bodyStrong,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dateText: {
    color: palette.faint,
    fontSize: typography.size.sm,
    fontFamily: typefaces.bodyStrong,
    paddingTop: 3,
  },
});
