import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";

import { CurrencySelect } from "@/src/components/ui/CurrencySelect";
import { MemberMultiSelect } from "@/src/components/ui/MemberMultiSelect";
import { TagInput } from "@/src/components/ui/TagInput";
import {
  Button,
  Card,
  LoadingState,
  PageHeader,
  Screen,
  TextField,
} from "@/src/components/ui/Primitives";
import { useAppData } from "@/src/state/AppDataProvider";
import type { CurrencyCode } from "@/src/types/models";

export function GroupFormScreen() {
  const { id } = useLocalSearchParams<{
    id?: string;
  }>();
  const data = useAppData();
  const group = data.groups.find((item) => item.id === id);
  const isPrivateGroup = group?.visibility !== "shared";
  const currentMemberIds = data.groupMembers
    .filter((groupMember) => groupMember.groupId === group?.id)
    .map((groupMember) => groupMember.memberId);

  const [name, setName] = useState(group?.name ?? "");
  const [notes, setNotes] = useState(group?.notes ?? "");
  const [defaultCurrency, setDefaultCurrency] = useState<CurrencyCode>(
    group?.defaultCurrency ?? data.settings.baseCurrency,
  );
  const [selectedTags, setSelectedTags] = useState<string[]>(group?.tags ?? []);
  const [memberIds, setMemberIds] = useState<string[]>(currentMemberIds);

  const memberOptions = useMemo(
    () =>
      data.members
        .filter((member) => !member.archived)
        .map((member) => ({ label: member.displayName, value: member.id })),
    [data.members],
  );
  const usedTagNames = useMemo(
    () => data.tags.map((tag) => tag.name),
    [data.tags],
  );

  if (data.loading) {
    return <LoadingState />;
  }

  async function save() {
    const input = {
      name,
      notes,
      defaultCurrency,
      allowedCurrencies: [defaultCurrency],
      tags: selectedTags,
      memberIds: isPrivateGroup ? memberIds : [],
    };

    if (group) {
      await data.updateGroup(group.id, input);
    } else {
      await data.createGroup(input);
    }

    router.back();
  }

  return (
    <Screen
      footer={
        <Button
          title={group ? "Save group" : "Create group"}
          icon="checkmark"
          onPress={save}
          disabled={!name.trim()}
        />
      }
    >
      <PageHeader eyebrow="Group" title={group ? "Edit group" : "Add group"} />

      <Card tone="peach">
        <TextField
          label="Name"
          value={name}
          onChangeText={setName}
          placeholder="Ski Trip Sweden"
        />
        {isPrivateGroup ? (
          <MemberMultiSelect
            label="Members"
            values={memberIds}
            options={memberOptions}
            onChange={setMemberIds}
          />
        ) : null}
        <CurrencySelect
          label="Default currency"
          value={defaultCurrency}
          onChange={setDefaultCurrency}
        />
        <TagInput
          value={selectedTags}
          onChange={setSelectedTags}
          usedTags={usedTagNames}
        />
        <TextField
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          placeholder="Optional details"
          multiline
        />
      </Card>
    </Screen>
  );
}
