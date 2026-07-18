import { Button, Form, Host, HStack, Picker, Section, Text, TextField, useNativeState, VStack } from "@expo/ui/swift-ui";
import { pickerStyle, tag } from "@expo/ui/swift-ui/modifiers";
import { Stack, router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator } from "react-native";

import { Button as NativeButton } from "@/src/components/ui/Button";
import {
  searchSignedUpMemberProfiles,
  type SignedUpMemberProfile,
} from "@/src/services/profileSearch";
import {
  createRemoteLinkRequest,
  hasAcceptedMemberLink,
} from "@/src/services/stage2Sync";
import { useAppData } from "@/src/state/AppDataProvider";
import { useAuth } from "@/src/state/AuthProvider";

const TAG_PICKER_NONE = "__none__";

export default function MemberFormIosScreen() {
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
  const [selectedTags, setSelectedTags] = useState<string[]>(member?.tags ?? []);

  const [profileQuery, setProfileQuery] = useState("");
  const [profileResults, setProfileResults] = useState<SignedUpMemberProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<SignedUpMemberProfile | null>(null);
  const [profileSearchLoading, setProfileSearchLoading] = useState(false);
  const [profileSearchError, setProfileSearchError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [tagPickerValue, setTagPickerValue] = useState(TAG_PICKER_NONE);

  const firstNameState = useNativeState(firstName);
  const lastNameState = useNativeState(lastName);
  const emailState = useNativeState(email);
  const phoneState = useNativeState(phone);
  const notesState = useNativeState(notes);
  const profileQueryState = useNativeState(profileQuery);

  const createdMemberId = useRef<string | null>(null);
  const remoteLinkRequestId = useRef<string | null>(null);

  const displayName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");

  const usedTagNames = useMemo(() => data.tags.map((item) => item.name), [data.tags]);

  useEffect(() => {
    firstNameState.set(firstName);
  }, [firstName, firstNameState]);

  useEffect(() => {
    lastNameState.set(lastName);
  }, [lastName, lastNameState]);

  useEffect(() => {
    emailState.set(email);
  }, [email, emailState]);

  useEffect(() => {
    phoneState.set(phone);
  }, [phone, phoneState]);

  useEffect(() => {
    notesState.set(notes);
  }, [notes, notesState]);

  useEffect(() => {
    profileQueryState.set(profileQuery);
  }, [profileQuery, profileQueryState]);

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
              error instanceof Error ? error.message : "Unable to search signed-up members.",
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

  function addTag(tagName: string) {
    const normalized = tagName.trim();
    if (!normalized || selectedTags.includes(normalized)) {
      return;
    }
    setSelectedTags((current) => [...current, normalized]);
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
        const archivedLinkedMember = selectedProfile
          ? data.members.find(
              (item) => item.archived && item.linkedUserId === selectedProfile.id,
            )
          : undefined;
        if (archivedLinkedMember && selectedProfile) {
          await data.updateMember(archivedLinkedMember.id, {
            ...input,
            notes: notes.trim() ? notes : archivedLinkedMember.notes,
            tags: selectedTags.length ? selectedTags : archivedLinkedMember.tags,
            archived: false,
            linkedUserId: selectedProfile.id,
            linkStatus: "linked",
            linkedProfileDisplayName: selectedProfile.displayName,
            linkedProfileEmail: selectedProfile.email,
          });
          router.back();
          return;
        }

        const acceptedLinkInLocalData = selectedProfile
          ? data.linkRequests.some(
              (request) =>
                request.status === "accepted" &&
                ((request.requesterUserId === auth.identity.authenticatedUserId &&
                  request.targetUserId === selectedProfile.id) ||
                  (request.targetUserId === auth.identity.authenticatedUserId &&
                    request.requesterUserId === selectedProfile.id)),
            )
          : false;
        const acceptedLink = selectedProfile
          ? acceptedLinkInLocalData || (await hasAcceptedMemberLink(selectedProfile.id))
          : false;
        const created = createdMemberId.current
          ? data.members.find((item) => item.id === createdMemberId.current)
          : await data.createMember(
              acceptedLink && selectedProfile
                ? {
                    ...input,
                    linkedUserId: selectedProfile.id,
                    linkStatus: "linked",
                    linkedProfileDisplayName: selectedProfile.displayName,
                    linkedProfileEmail: selectedProfile.email,
                  }
                : input,
            );

        if (!created) {
          throw new Error("Unable to find the locally created member.");
        }
        createdMemberId.current = created.id;

        if (acceptedLink && selectedProfile && created.linkStatus !== "linked") {
          await data.updateMember(created.id, {
            linkedUserId: selectedProfile.id,
            linkStatus: "linked",
            linkedProfileDisplayName: selectedProfile.displayName,
            linkedProfileEmail: selectedProfile.email,
          });
        } else if (selectedProfile && !acceptedLink) {
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
    <>
      <Stack.Screen
        options={{
          title: member ? "Edit member" : "Add member",
          headerLargeTitle: false,
          headerLeft: () => (
            <NativeButton
              title="Cancel"
              variant="ghost"
              onPress={() => router.back()}
            />
          ),
          headerRight: () => (
            <NativeButton
              title="Save"
              variant="ghost"
              onPress={() => {
                void save();
              }}
              disabled={!firstName.trim() || saving}
              accessibilityHint={member ? "Saves member changes" : "Creates the member"}
            />
          ),
        }}
      />
      <Host style={{ flex: 1 }} useViewportSizeMeasurement>
        <Form>
          {!member ? (
            <Section title="Linked account">
              <TextField
                text={profileQueryState}
                placeholder="Search name, email, phone"
                onTextChange={(value) => {
                  setProfileQuery(value);
                  setProfileSearchError(null);
                  if (value.trim().length < 2) {
                    setProfileResults([]);
                    setProfileSearchLoading(false);
                  }
                }}
              />

              {profileSearchLoading ? (
                <HStack spacing={8}>
                  <ActivityIndicator />
                  <Text>Searching</Text>
                </HStack>
              ) : null}

              {profileSearchError ? <Text>{profileSearchError}</Text> : null}

              {selectedProfile ? (
                <VStack spacing={6}>
                  <Text>Linked account selected: {selectedProfile.displayName}</Text>
                  <Button label="Clear linked account" role="destructive" onPress={clearSelectedProfile} />
                </VStack>
              ) : null}

              {profileResults.length
                ? profileResults.map((profile) => (
                    <Button key={profile.id} onPress={() => selectProfile(profile)}>
                      <VStack alignment="leading" spacing={2}>
                        <Text>{profile.displayName}</Text>
                        <Text>{profile.email ?? "Signed-up member"}</Text>
                      </VStack>
                    </Button>
                  ))
                : null}
            </Section>
          ) : null}

          <Section title="Details">
            {selectedProfile ? (
              <>
                <Text>First name: {firstName || "-"}</Text>
                <Text>Last name: {lastName || "-"}</Text>
                <Text>Email: {email || "-"}</Text>
              </>
            ) : (
              <>
                <TextField
                  text={firstNameState}
                  placeholder="First name"
                  onTextChange={(value) => setFirstName(value)}
                />
                <TextField
                  text={lastNameState}
                  placeholder="Last name (optional)"
                  onTextChange={(value) => setLastName(value)}
                />
                <TextField
                  text={emailState}
                  placeholder="Email (optional)"
                  onTextChange={(value) => setEmail(value)}
                />
                <TextField
                  text={phoneState}
                  placeholder="Phone (optional)"
                  onTextChange={(value) => setPhone(value)}
                />
              </>
            )}

            <Picker<string>
              label="Add tag"
              selection={tagPickerValue}
              onSelectionChange={(value) => {
                setTagPickerValue(value);
                if (value !== TAG_PICKER_NONE) {
                  addTag(value);
                  setTagPickerValue(TAG_PICKER_NONE);
                }
              }}
              modifiers={[pickerStyle("menu")]}
            >
              <Text modifiers={[tag(TAG_PICKER_NONE)]}>Choose a tag</Text>
              {usedTagNames.map((name) => (
                <Text key={name} modifiers={[tag(name)]}>
                  {name}
                </Text>
              ))}
            </Picker>

            {selectedTags.length ? (
              <VStack spacing={6}>
                {selectedTags.map((tagName) => (
                  <Button
                    key={tagName}
                    role="destructive"
                    label={`Remove tag: ${tagName}`}
                    onPress={() =>
                      setSelectedTags((current) => current.filter((item) => item !== tagName))
                    }
                  />
                ))}
              </VStack>
            ) : null}

            <TextField
              text={notesState}
              axis="vertical"
              placeholder="Notes"
              onTextChange={(value) => setNotes(value)}
            />

            {saveError ? <Text>{saveError}</Text> : null}
          </Section>
        </Form>
      </Host>
    </>
  );
}
