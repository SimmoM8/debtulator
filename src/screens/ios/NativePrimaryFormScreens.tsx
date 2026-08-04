import { Section, Text, Toggle } from "@expo/ui/swift-ui";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";

import {
  NativeDateField,
  NativePicker,
  NativeTextField,
} from "@/src/components/ios/NativeFormControls";
import { NativeFormScreen } from "@/src/components/ios/NativeFormScreen";
import { NativeStatusText } from "@/src/components/ios/NativeRows";
import { CURRENCIES } from "@/src/constants/currencies";
import { useAppData } from "@/src/state/AppDataProvider";
import { useAuth } from "@/src/state/AuthProvider";
import type { CurrencyCode, DebtDirection } from "@/src/types/models";
import { todayIsoDate } from "@/src/utils/id";

function tagsFromText(value: string) {
  return [...new Set(value.split(",").map((tag) => tag.trim()).filter(Boolean))];
}

function FormToolbar({
  enabled,
  saving,
  onSave,
}: {
  enabled: boolean;
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button onPress={() => router.back()}>Cancel</Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          variant="done"
          disabled={!enabled || saving}
          onPress={onSave}
        >
          {saving ? "Saving…" : "Save"}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
    </>
  );
}

export function NativeMemberFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const data = useAppData();
  const member = data.members.find((item) => item.id === id);
  const [name, setName] = useState(member?.displayName ?? "");
  const [email, setEmail] = useState(member?.email ?? "");
  const [phone, setPhone] = useState(member?.phone ?? "");
  const [notes, setNotes] = useState(member?.notes ?? "");
  const [tags, setTags] = useState((member?.tags ?? []).join(", "));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!name.trim() || saving) return;
    try {
      setSaving(true);
      setError(null);
      const input = {
        displayName: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        notes: notes.trim() || null,
        tags: tagsFromText(tags),
      };
      if (member) await data.updateMember(member.id, input);
      else await data.createMember(input);
      router.back();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The member could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Stack.Title>{member ? "Edit Member" : "New Member"}</Stack.Title>
      <FormToolbar enabled={Boolean(name.trim())} saving={saving} onSave={() => void save()} />
      <NativeFormScreen>
        <Section title="Member">
          <NativeTextField label="Name" value={name} onChange={setName} contentType="name" />
          <NativeTextField label="Email" value={email} onChange={setEmail} keyboard="email-address" contentType="emailAddress" />
          <NativeTextField label="Phone" value={phone} onChange={setPhone} keyboard="phone-pad" contentType="telephoneNumber" />
        </Section>
        <Section title="Details" footer={<Text>Separate tags with commas.</Text>}>
          <NativeTextField label="Tags" value={tags} onChange={setTags} />
          <NativeTextField label="Notes" value={notes} onChange={setNotes} multiline submit="done" />
          {error ? <NativeStatusText destructive>{error}</NativeStatusText> : null}
        </Section>
      </NativeFormScreen>
    </>
  );
}

export function NativeDebtFormScreen() {
  const { id, memberId, groupId } = useLocalSearchParams<{
    id?: string;
    memberId?: string;
    groupId?: string;
  }>();
  const data = useAppData();
  const auth = useAuth();
  const debt = data.debts.find((item) => item.id === id);
  const group = data.groups.find((item) => item.id === (debt?.groupId ?? groupId));
  const sharedMembers = data.sharedGroupMembers.filter(
    (item) => item.groupId === group?.id && !["archived", "merged"].includes(item.status),
  );
  const currentSharedMember = sharedMembers.find(
    (item) => item.linkedUserId === auth.identity.authenticatedUserId,
  );
  const isSharedGroupDebt = !debt && group?.visibility === "shared";
  const [selectedMemberId, setSelectedMemberId] = useState(
    debt?.memberId ?? memberId ?? data.members.find((item) => !item.archived)?.id ?? "",
  );
  const [debtorId, setDebtorId] = useState(currentSharedMember?.id ?? sharedMembers[0]?.id ?? "");
  const [creditorId, setCreditorId] = useState(sharedMembers.find((item) => item.id !== debtorId)?.id ?? "");
  const [direction, setDirection] = useState<DebtDirection>(debt?.direction ?? "they_owe_me");
  const [amount, setAmount] = useState(debt ? String(debt.amount) : "");
  const [currency, setCurrency] = useState<CurrencyCode>(debt?.currency ?? group?.defaultCurrency ?? data.settings.baseCurrency);
  const [title, setTitle] = useState(debt?.title ?? "");
  const [notes, setNotes] = useState(debt?.notes ?? "");
  const [dueDate, setDueDate] = useState(debt?.dueDate ?? todayIsoDate());
  const [tags, setTags] = useState((debt?.tags ?? []).join(", "));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = Boolean(title.trim() && Number(amount) > 0) &&
    (isSharedGroupDebt ? Boolean(debtorId && creditorId && debtorId !== creditorId) : Boolean(selectedMemberId));

  async function save() {
    if (!valid || saving) return;
    try {
      setSaving(true);
      setError(null);
      if (isSharedGroupDebt && group) {
        await data.createGroupDebt({
          groupId: group.id,
          remoteGroupId: group.remoteId,
          creatorUserId: auth.identity.authenticatedUserId,
          debtorGroupMemberId: debtorId,
          creditorGroupMemberId: creditorId,
          amount: Number(amount),
          currency,
          title: title.trim(),
          notes: notes.trim() || null,
          dueDate: dueDate || null,
          tags: tagsFromText(tags),
        });
      } else {
        const input = {
          memberId: selectedMemberId,
          direction,
          amount: Number(amount),
          currency,
          title: title.trim(),
          notes: notes.trim() || null,
          debtDate: debt?.debtDate ?? todayIsoDate(),
          dueDate: dueDate || null,
          tags: tagsFromText(tags),
          groupId: debt?.groupId ?? groupId ?? null,
        };
        if (debt) await data.updateDebt(debt.id, input, auth.identity.authenticatedUserId);
        else await data.createDebt(input);
      }
      router.back();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The debt could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Stack.Title>{debt ? "Edit Debt" : "New Debt"}</Stack.Title>
      <FormToolbar enabled={valid} saving={saving} onSave={() => void save()} />
      <NativeFormScreen>
        <Section title={isSharedGroupDebt ? "People" : "Member"}>
          {isSharedGroupDebt ? (
            <>
              <NativePicker label="Owes" value={debtorId} options={sharedMembers.map((item) => ({ label: item.displayName, value: item.id }))} onChange={setDebtorId} />
              <NativePicker label="Is owed" value={creditorId} options={sharedMembers.map((item) => ({ label: item.displayName, value: item.id }))} onChange={setCreditorId} />
            </>
          ) : (
            <>
              <NativePicker label="Member" value={selectedMemberId} options={data.members.filter((item) => !item.archived).map((item) => ({ label: item.displayName, value: item.id }))} onChange={setSelectedMemberId} />
              <NativePicker label="Direction" value={direction} options={[{ label: "They owe me", value: "they_owe_me" }, { label: "I owe them", value: "i_owe_them" }]} onChange={setDirection} style="segmented" />
            </>
          )}
        </Section>
        <Section title="Debt">
          <NativeTextField label="Title" value={title} onChange={setTitle} />
          <NativeTextField label="Amount" value={amount} onChange={setAmount} keyboard="decimal-pad" />
          <NativePicker label="Currency" value={currency} options={CURRENCIES.map((value) => ({ label: value, value }))} onChange={setCurrency} />
          <NativeDateField label="Due date" value={dueDate} onChange={setDueDate} optional />
        </Section>
        <Section title="Details" footer={<Text>Separate tags with commas.</Text>}>
          <NativeTextField label="Tags" value={tags} onChange={setTags} />
          <NativeTextField label="Notes" value={notes} onChange={setNotes} multiline submit="done" />
          {error ? <NativeStatusText destructive>{error}</NativeStatusText> : null}
        </Section>
      </NativeFormScreen>
    </>
  );
}

export function NativeGroupFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const data = useAppData();
  const group = data.groups.find((item) => item.id === id);
  const isPrivate = group?.visibility !== "shared";
  const initialMembers = data.groupMembers.filter((item) => item.groupId === group?.id).map((item) => item.memberId);
  const [name, setName] = useState(group?.name ?? "");
  const [notes, setNotes] = useState(group?.notes ?? "");
  const [currency, setCurrency] = useState<CurrencyCode>(group?.defaultCurrency ?? data.settings.baseCurrency);
  const [tags, setTags] = useState((group?.tags ?? []).join(", "));
  const [memberIds, setMemberIds] = useState(initialMembers);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const members = useMemo(() => data.members.filter((item) => !item.archived), [data.members]);

  function toggleMember(memberId: string, enabled: boolean) {
    setMemberIds((current) => enabled ? [...new Set([...current, memberId])] : current.filter((id) => id !== memberId));
  }

  async function save() {
    if (!name.trim() || saving) return;
    try {
      setSaving(true);
      setError(null);
      const input = {
        name: name.trim(),
        notes: notes.trim() || null,
        defaultCurrency: currency,
        allowedCurrencies: [currency],
        tags: tagsFromText(tags),
        memberIds: isPrivate ? memberIds : [],
      };
      const saved = group ? await data.updateGroup(group.id, input) : await data.createGroup(input);
      if (isPrivate) await data.setGroupMembers(saved.id, memberIds);
      router.back();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The group could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Stack.Title>{group ? "Edit Group" : "New Group"}</Stack.Title>
      <FormToolbar enabled={Boolean(name.trim())} saving={saving} onSave={() => void save()} />
      <NativeFormScreen>
        <Section title="Group">
          <NativeTextField label="Name" value={name} onChange={setName} />
          <NativePicker label="Default currency" value={currency} options={CURRENCIES.map((value) => ({ label: value, value }))} onChange={setCurrency} />
        </Section>
        {isPrivate ? (
          <Section title="Members" footer={<Text>Members can be changed later.</Text>}>
            {members.map((member) => (
              <Toggle key={member.id} label={member.displayName} isOn={memberIds.includes(member.id)} onIsOnChange={(enabled) => toggleMember(member.id, enabled)} />
            ))}
          </Section>
        ) : null}
        <Section title="Details" footer={<Text>Separate tags with commas.</Text>}>
          <NativeTextField label="Tags" value={tags} onChange={setTags} />
          <NativeTextField label="Notes" value={notes} onChange={setNotes} multiline submit="done" />
          {error ? <NativeStatusText destructive>{error}</NativeStatusText> : null}
        </Section>
      </NativeFormScreen>
    </>
  );
}
