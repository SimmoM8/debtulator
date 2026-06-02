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

export function EventFormScreen() {
  const { id } = useLocalSearchParams<{
    id?: string;
  }>();
  const data = useAppData();
  const event = data.events.find((item) => item.id === id);
  const isPrivateEvent = event?.visibility !== "shared";
  const currentMemberIds = data.eventMembers
    .filter((eventMember) => eventMember.eventId === event?.id)
    .map((eventMember) => eventMember.memberId);

  const [name, setName] = useState(event?.name ?? "");
  const [notes, setNotes] = useState(event?.notes ?? "");
  const [defaultCurrency, setDefaultCurrency] = useState<CurrencyCode>(
    event?.defaultCurrency ?? data.settings.baseCurrency,
  );
  const [selectedTags, setSelectedTags] = useState<string[]>(event?.tags ?? []);
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
      memberIds: isPrivateEvent ? memberIds : [],
    };

    if (event) {
      await data.updateEvent(event.id, input);
    } else {
      await data.createEvent(input);
    }

    router.back();
  }

  return (
    <Screen
      footer={
        <Button
          title={event ? "Save event" : "Create event"}
          icon="checkmark"
          onPress={save}
          disabled={!name.trim()}
        />
      }
    >
      <PageHeader eyebrow="Event" title={event ? "Edit event" : "Add event"} />

      <Card tone="peach">
        <TextField
          label="Name"
          value={name}
          onChangeText={setName}
          placeholder="Ski Trip Sweden"
        />
        {isPrivateEvent ? (
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
