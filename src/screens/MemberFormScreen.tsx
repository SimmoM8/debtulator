import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';

import {
  Button,
  Card,
  LoadingState,
  PageHeader,
  Screen,
  TextField,
} from '@/src/components/ui/Primitives';
import { useAppData } from '@/src/state/AppDataProvider';

export function MemberFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const data = useAppData();
  const member = data.members.find((item) => item.id === id);

  const [displayName, setDisplayName] = useState(member?.displayName ?? '');
  const [notes, setNotes] = useState(member?.notes ?? '');
  const [email, setEmail] = useState(member?.email ?? '');
  const [phone, setPhone] = useState(member?.phone ?? '');
  const [tags, setTags] = useState(member?.tags.join(', ') ?? '');

  const tagHint = useMemo(() => data.tags.map((tag) => tag.name).join(', '), [data.tags]);

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
          title={member ? 'Save member' : 'Create member'}
          icon="checkmark"
          onPress={save}
          disabled={!displayName.trim()}
        />
      }>
      <PageHeader
        eyebrow="Member"
        title={member ? 'Edit member' : 'Add member'}
        subtitle="Stage 1 members are manual and unlinked, with placeholders for future account linking."
      />

      <Card>
        <TextField label="Display name" value={displayName} onChangeText={setDisplayName} placeholder="Daniel" />
        <TextField label="Notes" value={notes} onChangeText={setNotes} placeholder="How you know them" multiline />
        <TextField label="Email placeholder" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <TextField label="Phone placeholder" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <TextField
          label="Tags"
          value={tags}
          onChangeText={setTags}
          placeholder={tagHint || 'Family, Friends, Travel'}
        />
      </Card>
    </Screen>
  );
}

function splitTags(value: string) {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}
