import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { TagInput } from "@/src/components/ui/TagInput";
import {
  Button,
  Card,
  LoadingState,
  PageHeader,
  Screen,
  TextField,
} from "@/src/components/ui/Primitives";
import { palette, typefaces, typography } from "@/src/constants/design";
import {
  searchSignedUpMemberProfiles,
  type SignedUpMemberProfile,
} from "@/src/services/profileSearch";
import { createRemoteLinkRequest } from "@/src/services/stage2Sync";
import { useAppData } from "@/src/state/AppDataProvider";
import { useAuth } from "@/src/state/AuthProvider";

export function MemberFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const data = useAppData();
  const auth = useAuth();
  const member = data.members.find((item) => item.id === id);

  const existingNameParts = member?.displayName.trim().split(/\s+/) ?? [];
  const [firstName, setFirstName] = useState(existingNameParts[0] ?? "");
  const [lastName, setLastName] = useState(existingNameParts.slice(1).join(" "));
  const [notes, setNotes] = useState(member?.notes ?? "");
  const [email, setEmail] = useState(member?.email ?? "");
  const [phone, setPhone] = useState(member?.phone ?? "");
  const [selectedTags, setSelectedTags] = useState<string[]>(
    member?.tags ?? [],
  );
  const [profileQuery, setProfileQuery] = useState("");
  const [profileResults, setProfileResults] = useState<SignedUpMemberProfile[]>(
    [],
  );
  const [selectedProfile, setSelectedProfile] =
    useState<SignedUpMemberProfile | null>(null);
  const [profileSearchLoading, setProfileSearchLoading] = useState(false);
  const [profileSearchError, setProfileSearchError] = useState<string | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const createdMemberId = useRef<string | null>(null);
  const remoteLinkRequestId = useRef<string | null>(null);

  const displayName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");

  const usedTagNames = useMemo(
    () => data.tags.map((tag) => tag.name),
    [data.tags],
  );

  useEffect(() => {
    if (member) {
      return;
    }

    const query = profileQuery.trim();
    if (query.length < 2) {
      return;
    }

    let cancelled = false;
    const timeout = setTimeout(() => {
      setProfileSearchLoading(true);
      searchSignedUpMemberProfiles({
        query,
        excludeUserId: auth.identity.authenticatedUserId,
      })
        .then((results) => {
          if (!cancelled) {
            setProfileResults(results);
            setProfileSearchError(null);
          }
        })
        .catch((error) => {
          if (!cancelled) {
            setProfileResults([]);
            setProfileSearchError(
              error instanceof Error
                ? error.message
                : "Unable to search signed-up members.",
            );
          }
        })
        .finally(() => {
          if (!cancelled) {
            setProfileSearchLoading(false);
          }
        });
    }, 280);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [auth.identity.authenticatedUserId, member, profileQuery]);

  if (data.loading || auth.loading) {
    return <LoadingState />;
  }

  function selectProfile(profile: SignedUpMemberProfile) {
    setSelectedProfile(profile);
    const fallbackParts = profile.displayName.trim().split(/\s+/);
    setFirstName(profile.firstName ?? fallbackParts[0] ?? "");
    setLastName(profile.lastName ?? fallbackParts.slice(1).join(" "));
    setEmail(profile.email ?? "");
    setPhone("");
    setProfileQuery(profile.displayName);
    setProfileResults([]);
  }

  function clearSelectedProfile() {
    setSelectedProfile(null);
    setProfileQuery("");
    setProfileResults([]);
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
  }

  async function save() {
    if (saving || !firstName.trim()) return;
    setSaving(true);
    setSaveError(null);
    const input = {
      displayName,
      notes,
      email,
      phone,
      tags: selectedTags,
    };

    try {
      if (member) {
        await data.updateMember(member.id, input);
      } else {
        const created = createdMemberId.current
          ? data.members.find((item) => item.id === createdMemberId.current)
          : await data.createMember(input);

        if (!created) {
          throw new Error("Unable to find the locally created member.");
        }
        createdMemberId.current = created.id;

        if (selectedProfile) {
          const requesterUserId = auth.identity.authenticatedUserId;
          if (!requesterUserId) {
            throw new Error("Sign in before sending a member link request.");
          }

          const remoteId =
            remoteLinkRequestId.current ??
            (await createRemoteLinkRequest({
              requesterUserId,
              targetUserId: selectedProfile.id,
              targetEmail: selectedProfile.email,
              requesterMemberId: created.id,
              requesterDisplayName: auth.identity.displayName,
            }));
          remoteLinkRequestId.current = remoteId;
          await data.sendMemberLinkRequest(created.id, {
            requesterUserId,
            requesterDisplayName: auth.identity.displayName,
            targetUserId: selectedProfile.id,
            targetEmail: selectedProfile.email,
            remoteId,
          });
        }
      }
      router.back();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Unable to add member.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen
      footer={
        <Button
          title={member ? "Save member" : selectedProfile ? "Add linked member" : "Create member"}
          icon="checkmark"
          onPress={save}
          disabled={!firstName.trim() || saving}
        />
      }
    >
      <PageHeader
        eyebrow="Member"
        title={member ? "Edit member" : "Add member"}
      />

      {!member ? (
        <Card tone="lavender">
          <TextField
            label="Find signed-up member"
            value={profileQuery}
            onChangeText={(value) => {
              setProfileQuery(value);
              setProfileSearchError(null);
              if (value.trim().length < 2) {
                setProfileResults([]);
                setProfileSearchLoading(false);
              }
            }}
            editable={!selectedProfile}
            placeholder="Search name, email, phone"
          />
          {profileSearchLoading ? (
            <View style={styles.searchStatus}>
              <ActivityIndicator color={palette.primary} />
              <Text style={styles.searchStatusText}>Searching</Text>
            </View>
          ) : null}
          {profileSearchError ? (
            <Text style={styles.searchError}>{profileSearchError}</Text>
          ) : null}
          {selectedProfile ? (
            <View style={styles.selectedProfileRow}>
              <Text style={styles.selectedProfileText}>Linked account selected</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Clear selected linked member" onPress={clearSelectedProfile}>
                <Text style={styles.clearSelection}>Clear</Text>
              </Pressable>
            </View>
          ) : null}
          {profileResults.length ? (
            <View style={styles.profileResults}>
              {profileResults.map((profile) => (
                <Pressable
                  key={profile.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${profile.displayName}`}
                  onPress={() => selectProfile(profile)}
                  style={({ pressed }) => [
                    styles.profileResult,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.profileAvatar}>
                    <Text style={styles.profileAvatarText}>
                      {profile.displayName.slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.profileResultCopy}>
                    <Text style={styles.profileName}>{profile.displayName}</Text>
                    <Text style={styles.profileMeta} numberOfLines={1}>
                      {profile.email ?? "Signed-up member"}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : null}
        </Card>
      ) : null}

      <Card tone="peach">
        {selectedProfile ? (
          <View style={styles.linkedDetails}>
            <ReadOnlyDetail label="First name" value={firstName} />
            <ReadOnlyDetail label="Last name" value={lastName || "—"} />
            <ReadOnlyDetail label="Email" value={email || "—"} />
          </View>
        ) : (
          <>
            <TextField label="First name" value={firstName} onChangeText={setFirstName} placeholder="Daniel" />
            <TextField label="Last name (optional)" value={lastName} onChangeText={setLastName} placeholder="Andersson" />
            <TextField label="Email (optional)" value={email} onChangeText={setEmail} placeholder="name@example.com" keyboardType="email-address" />
            <TextField label="Phone (optional)" value={phone} onChangeText={setPhone} placeholder="+46 ..." keyboardType="phone-pad" />
          </>
        )}
        <TagInput
          value={selectedTags}
          onChange={setSelectedTags}
          usedTags={usedTagNames}
        />
        <TextField
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          placeholder="How you know them"
          multiline
        />
        {saveError ? <Text style={styles.searchError}>{saveError}</Text> : null}
      </Card>
    </Screen>
  );
}

function ReadOnlyDetail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.readOnlyDetail}>
      <Text style={styles.readOnlyLabel}>{label}</Text>
      <Text style={styles.readOnlyValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  searchStatus: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchStatusText: {
    color: palette.muted,
    fontSize: typography.size.sm,
    fontFamily: typefaces.bodyStrong,
  },
  searchError: {
    color: palette.danger,
    fontSize: typography.size.sm,
    fontFamily: typefaces.bodyStrong,
  },
  selectedProfileText: {
    color: palette.primary,
    fontSize: typography.size.sm,
    fontFamily: typefaces.bodyStrong,
  },
  selectedProfileRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  clearSelection: {
    color: palette.danger,
    fontSize: typography.size.sm,
    fontFamily: typefaces.bodyStrong,
  },
  linkedDetails: {
    gap: 14,
  },
  readOnlyDetail: {
    gap: 4,
  },
  readOnlyLabel: {
    color: palette.muted,
    fontSize: typography.size.sm,
    fontFamily: typefaces.bodyStrong,
  },
  readOnlyValue: {
    color: palette.textPrimary,
    fontSize: typography.size.base,
    fontFamily: typefaces.body,
  },
  profileResults: {
    gap: 6,
  },
  profileResult: {
    minHeight: 58,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderIndigoSoft,
    backgroundColor: "rgba(255,255,255,0.62)",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  profileAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: palette.brandSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatarText: {
    color: palette.primary,
    fontSize: typography.size.base,
    fontFamily: typefaces.bodyHeavy,
  },
  profileResultCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  profileName: {
    color: palette.textPrimary,
    fontSize: typography.size.base,
    fontFamily: typefaces.bodyStrong,
  },
  profileMeta: {
    color: palette.muted,
    fontSize: typography.size.sm,
    fontFamily: typefaces.body,
  },
  pressed: {
    opacity: 0.76,
  },
});
