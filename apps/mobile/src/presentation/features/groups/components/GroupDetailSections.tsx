import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { DebtRow } from "@/src/presentation/components/EntityRows";
import { Badge, VerificationBadge } from "@/src/presentation/design-system/Badges";
import { GlassSurface } from "@/src/presentation/design-system/GlassSurface";
import {
  Button,
  Card,
  SectionTitle,
  SelectChips,
  TextField,
} from "@/src/presentation/design-system/Primitives";
import {
  palette,
  radii,
  spacing,
  typefaces,
  typography,
} from "@/src/presentation/theme/design";
import { participantName } from "@debtulator/domain/ledger/ledger";
import type {
  GroupRole,
  GroupSettlementSettings,
  LedgerEntry,
  SharedGroupMember,
} from "@debtulator/domain/models";

export function GroupLedgerRow({
  entry,
  sharedMembers,
  currentGroupMember,
  canVerify,
  rejectionReason,
  onReasonChange,
  onVerify,
  onReject,
}: {
  entry: LedgerEntry;
  sharedMembers: SharedGroupMember[];
  currentGroupMember?: SharedGroupMember;
  canVerify: boolean;
  rejectionReason: string;
  onReasonChange: (value: string) => void;
  onVerify: () => void;
  onReject: () => void;
}) {
  const currentMemberInvolved =
    currentGroupMember &&
    (entry.fromId === currentGroupMember.id ||
      entry.toId === currentGroupMember.id);
  return (
    <View style={styles.verificationBlock}>
      <DebtRow entry={entry} members={[]} sharedGroupMembers={sharedMembers} />
      <View style={styles.badgeLine}>
        <VerificationBadge status={entry.verificationStatus} />
        <Text style={styles.body}>
          {participantName(entry.fromId, [], sharedMembers)} owes{" "}
          {participantName(entry.toId, [], sharedMembers)}
        </Text>
      </View>
      {canVerify && currentMemberInvolved ? (
        <>
          <TextField
            label="Rejection reason"
            value={rejectionReason}
            onChangeText={onReasonChange}
            placeholder="Required when rejecting"
            multiline
          />
          <View style={styles.actionRow}>
            <Button title="Verify" icon="shield-checkmark" onPress={onVerify} />
            <Button
              title="Reject"
              icon="close-circle"
              variant="danger"
              disabled={!rejectionReason.trim()}
              onPress={onReject}
            />
          </View>
        </>
      ) : null}
    </View>
  );
}

export function SettingToggle({
  settings,
  onChange,
}: {
  settings: GroupSettlementSettings;
  onChange: (settings: GroupSettlementSettings) => void;
}) {
  return (
    <View style={styles.toggleGrid}>
      {[
        ["includePending", "Include pending"],
        ["includePartiallyVerified", "Include partially verified"],
        ["includeRejectedDisputed", "Include rejected/disputed"],
        ["includeSettled", "Include settled"],
        ["directDebtOnly", "Direct debts only"],
        ["verifiedOnly", "Verified records only"],
        ["convertedCurrency", "Estimated converted settlement"],
      ].map(([key, label]) => {
        const typedKey = key as keyof GroupSettlementSettings;
        return (
          <Button
            key={key}
            title={label}
            icon={settings[typedKey] ? "checkbox" : "square-outline"}
            variant={settings[typedKey] ? "secondary" : "ghost"}
            onPress={() =>
              onChange({ ...settings, [typedKey]: !settings[typedKey] })
            }
          />
        );
      })}
    </View>
  );
}

export function SharedMembersPanel({
  groupMembers,
  warnings,
  claims,
  canManage,
  canInvite,
  currentUserId,
  newMemberName,
  newMemberEmail,
  newMemberPhone,
  inviteDisplayName,
  inviteEmail,
  inviteRole,
  claimMessage,
  setNewMemberName,
  setNewMemberEmail,
  setNewMemberPhone,
  setInviteDisplayName,
  setInviteEmail,
  setInviteRole,
  setClaimMessage,
  addUnlinkedGroupMember,
  sendInvite,
  claimMember,
  ignoreWarning,
  mergeMembers,
  approveClaim,
  rejectClaim,
}: {
  groupMembers: SharedGroupMember[];
  warnings: {
    id: string;
    groupMemberIdA: string;
    groupMemberIdB: string;
    reason: string;
    confidence: string;
  }[];
  claims: {
    id: string;
    groupMemberId: string;
    claimantUserId: string;
    message: string | null;
  }[];
  canManage: boolean;
  canInvite: boolean;
  currentUserId: string | null;
  newMemberName: string;
  newMemberEmail: string;
  newMemberPhone: string;
  inviteDisplayName: string;
  inviteEmail: string;
  inviteRole: Exclude<GroupRole, "owner">;
  claimMessage: string;
  setNewMemberName: (value: string) => void;
  setNewMemberEmail: (value: string) => void;
  setNewMemberPhone: (value: string) => void;
  setInviteDisplayName: (value: string) => void;
  setInviteEmail: (value: string) => void;
  setInviteRole: (value: Exclude<GroupRole, "owner">) => void;
  setClaimMessage: (value: string) => void;
  addUnlinkedGroupMember: () => void;
  sendInvite: () => void;
  claimMember: (member: SharedGroupMember) => void;
  ignoreWarning: (warningId: string) => void | Promise<unknown>;
  mergeMembers: (sourceId: string, targetId: string) => void | Promise<unknown>;
  approveClaim: (claimId: string) => void | Promise<unknown>;
  rejectClaim: (claimId: string) => void | Promise<unknown>;
}) {
  const activeMembers = groupMembers.filter(
    (member) => member.status !== "merged",
  );
  return (
    <>
      <Card>
        <SectionTitle
          title="Group members"
          subtitle="Linked users and shared placeholders are group-specific."
        />
        {activeMembers.map((member) => (
          <View key={member.id} style={styles.memberRow}>
            <View style={styles.flexOne}>
              <View style={styles.badgeLine}>
                <Text style={styles.rowTitle}>{member.displayName}</Text>
                <Badge
                  label={member.type === "linked_user" ? "linked" : "unlinked"}
                  tone={member.type === "linked_user" ? "positive" : "amber"}
                />
                <Badge
                  label={member.status}
                  tone={member.status === "active" ? "neutral" : "blue"}
                />
              </View>
              {member.email || member.phone ? (
                <Text style={styles.body}>{member.email ?? member.phone}</Text>
              ) : null}
            </View>
            {member.type === "unlinked_placeholder" && currentUserId ? (
              <Button
                title="Claim this member"
                icon="person-add"
                variant="secondary"
                onPress={() => claimMember(member)}
              />
            ) : null}
          </View>
        ))}
        {currentUserId ? (
          <TextField
            label="Claim message"
            value={claimMessage}
            onChangeText={setClaimMessage}
            placeholder="Optional"
          />
        ) : null}
      </Card>

      {canManage ? (
        <Card>
          <SectionTitle
            title="Add unlinked member"
            subtitle="Shared placeholders are visible to all group participants."
          />
          <TextField
            label="Display name"
            value={newMemberName}
            onChangeText={setNewMemberName}
            placeholder="Dad"
          />
          <TextField
            label="Email"
            value={newMemberEmail}
            onChangeText={setNewMemberEmail}
            keyboardType="email-address"
          />
          <TextField
            label="Phone"
            value={newMemberPhone}
            onChangeText={setNewMemberPhone}
            keyboardType="phone-pad"
          />
          <Button
            title="Add unlinked member"
            icon="person-add"
            disabled={!newMemberName.trim()}
            onPress={addUnlinkedGroupMember}
          />
        </Card>
      ) : null}

      {canInvite ? (
        <Card>
          <SectionTitle
            title="Invite members"
            subtitle="Accepting an invite shares only group-specific records."
          />
          <TextField
            label="Display name"
            value={inviteDisplayName}
            onChangeText={setInviteDisplayName}
            placeholder="Sarah"
          />
          <TextField
            label="Email"
            value={inviteEmail}
            onChangeText={setInviteEmail}
            keyboardType="email-address"
          />
          <SelectChips
            label="Role offered"
            value={inviteRole}
            options={[
              { label: "Admin", value: "admin" },
              { label: "Member", value: "member" },
              { label: "Viewer", value: "viewer" },
            ]}
            onChange={setInviteRole}
          />
          <Button
            title="Invite members"
            icon="mail"
            disabled={!inviteDisplayName.trim()}
            onPress={sendInvite}
          />
        </Card>
      ) : null}

      {claims.length > 0 ? (
        <Card tone="blue">
          <SectionTitle
            title="Claim requests"
            subtitle="Owner/admin approval links a placeholder to a real user."
          />
          {claims.map((claim) => {
            const member = groupMembers.find(
              (item) => item.id === claim.groupMemberId,
            );
            return (
              <View key={claim.id} style={styles.warningRow}>
                <Text style={styles.body}>
                  {claim.claimantUserId} wants to claim{" "}
                  {member?.displayName ?? "an group member"}.
                </Text>
                {claim.message ? (
                  <Text style={styles.body}>{claim.message}</Text>
                ) : null}
                {canManage ? (
                  <View style={styles.actionRow}>
                    <Button
                      title="Approve claim"
                      icon="checkmark-circle"
                      onPress={() => approveClaim(claim.id)}
                    />
                    <Button
                      title="Reject claim"
                      icon="close-circle"
                      variant="secondary"
                      onPress={() => rejectClaim(claim.id)}
                    />
                  </View>
                ) : null}
              </View>
            );
          })}
        </Card>
      ) : null}

      {warnings.length > 0 ? (
        <Card tone="amber">
          <SectionTitle
            title="Possible duplicate member"
            subtitle="Warnings never auto-merge members."
          />
          {warnings.map((warning) => {
            const first = groupMembers.find(
              (member) => member.id === warning.groupMemberIdA,
            );
            const second = groupMembers.find(
              (member) => member.id === warning.groupMemberIdB,
            );
            return (
              <View key={warning.id} style={styles.warningRow}>
                <Text style={styles.body}>
                  {first?.displayName ?? "Member"} and{" "}
                  {second?.displayName ?? "Member"} may refer to the same
                  person. {warning.reason}
                </Text>
                <View style={styles.actionRow}>
                  <Button
                    title="Ignore"
                    icon="close"
                    variant="secondary"
                    onPress={() => ignoreWarning(warning.id)}
                  />
                  {canManage && first && second ? (
                    <Button
                      title="Merge"
                      icon="git-merge"
                      onPress={() => mergeMembers(first.id, second.id)}
                    />
                  ) : null}
                </View>
              </View>
            );
          })}
        </Card>
      ) : null}
    </>
  );
}

export function PrivateMembersPanel({
  groupMemberIds,
  members,
  duplicateWarnings,
  toggleMember,
  ignoreWarning,
}: {
  groupId: string;
  groupMemberIds: string[];
  members: { id: string; displayName: string; archived: boolean }[];
  duplicateWarnings: { key: string; message: string }[];
  ignoredDuplicateKeys: string[];
  toggleMember: (memberId: string) => void;
  ignoreWarning: (key: string) => void;
}) {
  return (
    <>
      <Card>
        <SectionTitle
          title="Private group members"
          subtitle="Private groups use local/manual members only."
        />
        <View style={styles.memberWrap}>
          <View style={[styles.memberChip, styles.memberChipSelected]}>
            <Text style={styles.memberChipSelectedText}>You</Text>
          </View>
          {members
            .filter((member) => !member.archived)
            .map((member) => {
              const selected = groupMemberIds.includes(member.id);
              return (
                <Pressable
                  key={member.id}
                  accessibilityRole="button"
                  accessibilityLabel={member.displayName}
                  accessibilityState={{ selected }}
                  onPress={() => toggleMember(member.id)}
                >
                  {({ pressed }) => (
                    <GlassSurface
                      role={selected ? "surface" : "control"}
                      interactive
                      style={[
                        styles.memberChip,
                        selected && styles.memberChipSelected,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.memberChipText,
                          selected && styles.memberChipSelectedText,
                        ]}
                      >
                        {member.displayName}
                      </Text>
                    </GlassSurface>
                  )}
                </Pressable>
              );
            })}
        </View>
      </Card>
      {duplicateWarnings.length > 0 ? (
        <Card tone="amber">
          <SectionTitle
            title="Possible duplicate members"
            subtitle="Warnings do not auto-merge local contacts."
          />
          {duplicateWarnings.map((warning) => (
            <View key={warning.key} style={styles.warningRow}>
              <Text style={styles.body}>{warning.message}</Text>
              <Button
                title="Ignore warning"
                icon="close"
                variant="secondary"
                onPress={() => ignoreWarning(warning.key)}
              />
            </View>
          ))}
        </Card>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  flexOne: {
    flex: 1,
    gap: spacing.sm,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  badgeLine: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.xs,
  },
  memberWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  memberChip: {
    minHeight: 36,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: "rgba(255,255,255,0.82)",
    paddingHorizontal: spacing.md,
    justifyContent: "center",
  },
  memberChipSelected: {
    backgroundColor: palette.brand,
    borderColor: palette.brand,
  },
  memberChipText: {
    color: palette.muted,
    fontSize: typography.size.md,
    fontFamily: typefaces.bodyStrong,
  },
  memberChipSelectedText: {
    color: "#FFFFFF",
    fontSize: typography.size.md,
    fontFamily: typefaces.bodyHeavy,
  },
  pressed: {
    opacity: 0.72,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  warningRow: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  body: {
    color: palette.muted,
    fontSize: typography.size.base,
    lineHeight: typography.line.xl,
    fontFamily: typefaces.body,
  },
  rowTitle: {
    color: palette.ink,
    fontSize: typography.size.xl,
    fontFamily: typefaces.bodyHeavy,
  },
  verificationBlock: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  toggleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
});
