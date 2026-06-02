import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

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

  const [displayName, setDisplayName] = useState(member?.displayName ?? "");
  const [notes, setNotes] = useState(member?.notes ?? "");
  const [email, setEmail] = useState(member?.email ?? "");
  const [phone, setPhone] = useState(member?.phone ?? "");
  const [tags, setTags] = useState(member?.tags.join(", ") ?? "");
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

  const tagHint = useMemo(
    () => data.tags.map((tag) => tag.name).join(", "),
    [data.tags],
  );

  useEffect(() => {
    if (member) {
      return;
    }

    const query = profileQuery.trim();
    if (query.length < 2) {
      setProfileResults([]);
      setProfileSearchLoading(false);
      setProfileSearchError(null);
      return;
    }

    let cancelled = false;
    setProfileSearchLoading(true);
    const timeout = setTimeout(() => {
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
    setDisplayName(profile.displayName);
    setEmail(profile.email ?? "");
    setPhone(profile.phone ?? "");
    setProfileQuery(profile.displayName);
    setProfileResults([]);
  }

  async function save() {
    const input = {
      displayName,
      notes,
      email,
      phone,
      linkedProfileDisplayName: selectedProfile?.displayName,
      linkedProfileEmail: selectedProfile?.email,
      linkedProfilePhone: selectedProfile?.phone,
      tags: splitTags(tags),
    };

    if (member) {
      await data.updateMember(member.id, input);
    } else {
      const created = await data.createMember(input);
      if (selectedProfile && auth.identity.authenticatedUserId) {
        const remoteId = await createRemoteLinkRequest({
          requesterUserId: auth.identity.authenticatedUserId,
          targetUserId: selectedProfile.id,
          targetEmail: selectedProfile.email,
          targetPhone: selectedProfile.phone,
          requesterMemberId: created.id,
          requesterLabel: created.displayName,
        });
        await data.sendMemberLinkRequest(created.id, {
          requesterUserId: auth.identity.authenticatedUserId,
          targetUserId: selectedProfile.id,
          targetEmail: selectedProfile.email,
          targetPhone: selectedProfile.phone,
          remoteId,
        });
      }
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
      />

      {!member ? (
        <Card tone="lavender">
          <TextField
            label="Find signed-up member"
            value={profileQuery}
            onChangeText={(value) => {
              setProfileQuery(value);
              setSelectedProfile(null);
            }}
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
            <Text style={styles.selectedProfileText}>
              Selected {selectedProfile.displayName}
            </Text>
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
                      {profile.email ?? profile.phone ?? "Signed-up member"}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : null}
        </Card>
      ) : null}

      <Card tone="peach">
        <TextField
          label="Display name"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Daniel"
        />
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="name@example.com"
          keyboardType="email-address"
        />
        <TextField
          label="Phone"
          value={phone}
          onChangeText={setPhone}
          placeholder="+46 ..."
          keyboardType="phone-pad"
        />
        <TextField
          label="Tags"
          value={tags}
          onChangeText={setTags}
          placeholder={tagHint || "Family, Friends, Travel"}
        />
        <TextField
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          placeholder="How you know them"
          multiline
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
