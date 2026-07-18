import { Section, Text, Toggle } from "@expo/ui/swift-ui";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";

import { NativeConfirmationDialog } from "@/src/components/ios/NativeConfirmationDialog";
import {
  NativeDateField,
  NativePicker,
  NativeTextField,
} from "@/src/components/ios/NativeFormControls";
import { NativeFormScreen } from "@/src/components/ios/NativeFormScreen";
import { NativeEmptyState } from "@/src/components/ios/NativeEmptyState";
import { NativeStatusText } from "@/src/components/ios/NativeRows";
import { CURRENCIES } from "@/src/constants/currencies";
import { sourceRecordTypeForEntry } from "@/src/services/ledger";
import { useAppData } from "@/src/state/AppDataProvider";
import { useAuth } from "@/src/state/AuthProvider";
import type {
  CurrencyCode,
  DebtDirection,
  ParticipantId,
  RecurringTemplateType,
  SplitMethod,
} from "@/src/types/models";
import { todayIsoDate } from "@/src/utils/id";

function FormToolbar({ enabled, saving, onSave }: { enabled: boolean; saving: boolean; onSave: () => void }) {
  return (
    <>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button onPress={() => router.back()}>Cancel</Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button variant="done" disabled={!enabled || saving} onPress={onSave}>
          {saving ? "Saving…" : "Save"}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
    </>
  );
}
function participantLabel(
  id: ParticipantId,
  members: { id: string; displayName: string }[],
  sharedMembers: { id: string; displayName: string }[],
) {
  if (id === "me") return "You";
  return sharedMembers.find((item) => item.id === id)?.displayName ??
    members.find((item) => item.id === id)?.displayName ?? "Member";
}

export function NativeExpenseFormScreen() {
  const { id, groupId } = useLocalSearchParams<{ id?: string; groupId?: string }>();
  const data = useAppData();
  const auth = useAuth();
  const expense = data.sharedExpenses.find((item) => item.id === id);
  const initialGroupId = expense?.groupId ?? groupId ?? data.groups.find((item) => !item.archived)?.id ?? "";
  const [selectedGroupId, setSelectedGroupId] = useState(initialGroupId);
  const group = data.groups.find((item) => item.id === selectedGroupId);
  const shared = group?.visibility === "shared";
  const participantOptions = useMemo<ParticipantId[]>(() => {
    if (shared) {
      return data.sharedGroupMembers
        .filter((item) => item.groupId === selectedGroupId && !["archived", "merged"].includes(item.status))
        .map((item) => item.id);
    }
    return ["me", ...data.groupMembers.filter((item) => item.groupId === selectedGroupId).map((item) => item.memberId)];
  }, [data.groupMembers, data.sharedGroupMembers, selectedGroupId, shared]);
  const currentSharedMember = data.sharedGroupMembers.find(
    (item) => item.groupId === selectedGroupId && item.linkedUserId === auth.identity.authenticatedUserId,
  );
  const [payerId, setPayerId] = useState<ParticipantId>(expense?.payerId ?? currentSharedMember?.id ?? "me");
  const [participants, setParticipants] = useState<ParticipantId[]>(expense?.participantIds ?? participantOptions);
  const [splitMethod, setSplitMethod] = useState<SplitMethod>(expense?.splitMethod ?? "equal");
  const [allocations, setAllocations] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(expense?.splitAllocations ?? {}).map(([key, value]) => [key, String(value)])),
  );
  const [amount, setAmount] = useState(expense ? String(expense.amount) : "");
  const [currency, setCurrency] = useState<CurrencyCode>(expense?.currency ?? group?.defaultCurrency ?? data.settings.baseCurrency);
  const [title, setTitle] = useState(expense?.title ?? "");
  const [notes, setNotes] = useState(expense?.notes ?? "");
  const [date, setDate] = useState(expense?.expenseDate ?? todayIsoDate());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleParticipant(participantId: ParticipantId, enabled: boolean) {
    setParticipants((current) => enabled ? [...new Set([...current, participantId])] : current.filter((id) => id !== participantId));
  }

  const numericAllocations = Object.fromEntries(participants.map((participantId) => [participantId, Number(allocations[participantId]) || 0]));
  const valid = Boolean(selectedGroupId && title.trim() && Number(amount) > 0 && participants.length && payerId);

  async function save() {
    if (!valid || saving) return;
    try {
      setSaving(true);
      setError(null);
      const input = {
        groupId: selectedGroupId,
        creatorUserId: shared ? auth.identity.authenticatedUserId : null,
        payerId,
        amount: Number(amount),
        currency,
        title: title.trim(),
        notes: notes.trim() || null,
        expenseDate: date,
        participantIds: participants,
        splitMethod,
        splitAllocations: splitMethod === "equal" ? {} : numericAllocations,
        visibility: shared ? "shared_group" as const : "private" as const,
      };
      if (expense) await data.updateSharedExpense(expense.id, input);
      else await data.createSharedExpense(input);
      router.back();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The expense could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Stack.Title>{expense ? "Edit Expense" : "New Expense"}</Stack.Title>
      <FormToolbar enabled={valid} saving={saving} onSave={() => void save()} />
      <NativeFormScreen>
        <Section title="Expense">
          <NativePicker label="Group" value={selectedGroupId} options={data.groups.filter((item) => !item.archived).map((item) => ({ label: item.name, value: item.id }))} onChange={setSelectedGroupId} />
          <NativeTextField label="Title" value={title} onChange={setTitle} />
          <NativeTextField label="Amount" value={amount} onChange={setAmount} keyboard="decimal-pad" />
          <NativePicker label="Currency" value={currency} options={CURRENCIES.map((value) => ({ label: value, value }))} onChange={setCurrency} />
          <NativeDateField label="Date" value={date} onChange={setDate} />
        </Section>
        <Section title="Paid by">
          <NativePicker label="Payer" value={payerId} options={participantOptions.map((value) => ({ label: participantLabel(value, data.members, data.sharedGroupMembers), value }))} onChange={setPayerId} />
        </Section>
        <Section title="Split between">
          {participantOptions.map((participantId) => (
            <Toggle key={participantId} label={participantLabel(participantId, data.members, data.sharedGroupMembers)} isOn={participants.includes(participantId)} onIsOnChange={(enabled) => toggleParticipant(participantId, enabled)} />
          ))}
          <NativePicker label="Method" value={splitMethod} options={[{ label: "Equally", value: "equal" }, { label: "Custom amount", value: "custom_amount" }]} onChange={setSplitMethod} />
          {splitMethod === "custom_amount" ? participants.map((participantId) => (
            <NativeTextField key={participantId} label={participantLabel(participantId, data.members, data.sharedGroupMembers)} value={allocations[participantId] ?? ""} onChange={(value) => setAllocations((current) => ({ ...current, [participantId]: value }))} keyboard="decimal-pad" />
          )) : null}
        </Section>
        <Section title="Notes">
          <NativeTextField label="Optional notes" value={notes} onChange={setNotes} multiline submit="done" />
          {error ? <NativeStatusText destructive>{error}</NativeStatusText> : null}
        </Section>
      </NativeFormScreen>
    </>
  );
}

export function NativePaymentFormScreen() {
  const { debtId, groupId, memberId, payerId: initialPayerId, payeeId: initialPayeeId } = useLocalSearchParams<{
    debtId?: string; groupId?: string; memberId?: string; payerId?: string; payeeId?: string;
  }>();
  const data = useAppData();
  const auth = useAuth();
  const focused = data.ledgerEntries.find((entry) => entry.id === debtId || entry.sourceId === debtId);
  const entries = data.ledgerEntries.filter((entry) => {
    if (entry.remainingAmount <= 0.005) return false;
    if (groupId || focused?.groupId) return entry.groupId === (groupId ?? focused?.groupId);
    if (memberId) return entry.fromId === memberId || entry.toId === memberId;
    return true;
  });
  const availableIds = [...new Set(entries.flatMap((entry) => [entry.fromId, entry.toId]))];
  const [payerId, setPayerId] = useState<ParticipantId>(initialPayerId ?? focused?.fromId ?? availableIds[0] ?? "me");
  const [payeeId, setPayeeId] = useState<ParticipantId>(initialPayeeId ?? focused?.toId ?? availableIds.find((id) => id !== payerId) ?? "me");
  const [amount, setAmount] = useState(focused ? String(focused.remainingAmount) : "");
  const [currency, setCurrency] = useState<CurrencyCode>(focused?.currency ?? data.settings.baseCurrency);
  const [date, setDate] = useState(todayIsoDate());
  const [notes, setNotes] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>(focused ? [focused.id] : []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationPresented, setConfirmationPresented] = useState(false);
  const selectedEntries = entries.filter((entry) => selectedIds.includes(entry.id) && entry.currency === currency);
  const valid = payerId !== payeeId && Number(amount) > 0;

  function toggleEntry(id: string, enabled: boolean) {
    setSelectedIds((current) => enabled ? [...new Set([...current, id])] : current.filter((item) => item !== id));
  }

  async function persist() {
    if (!valid || saving) return;
    try {
      setSaving(true);
      setError(null);
      let remaining = Number(amount);
      const lines = selectedEntries.map((entry) => {
        const appliedAmount = Math.min(entry.remainingAmount, Math.max(remaining, 0));
        remaining -= appliedAmount;
        return { sourceRecordType: sourceRecordTypeForEntry(entry), sourceRecordId: entry.sourceId, appliedAmount };
      }).filter((line) => line.appliedAmount > 0);
      const focusedDebt = focused?.kind === "simple_debt" ? data.debts.find((debt) => debt.id === focused.sourceId) : undefined;
      const linkedMember = data.members.find((member) => member.id === (focusedDebt?.memberId ?? memberId));
      const requiresConfirmation = linkedMember?.linkStatus === "linked" && Boolean(linkedMember.linkedUserId && auth.identity.authenticatedUserId);
      const result = await data.createPaymentSettlement({
        payerId,
        payeeId,
        amount: Number(amount),
        currency,
        paymentDate: date,
        notes: notes.trim() || null,
        groupId: groupId ?? focused?.groupId ?? null,
        relatedMemberId: linkedMember?.id ?? null,
        visibility: requiresConfirmation ? "shared_with_involved_member" : undefined,
        confirmationStatus: requiresConfirmation ? "pending_confirmation" : undefined,
        createdByUserId: auth.identity.authenticatedUserId,
        lines,
        settlementType: "manual",
      });
      router.replace({ pathname: "/(tabs)/debts/settlement/[id]", params: { id: result.settlement.id } } as never);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The payment could not be recorded.");
    } finally {
      setSaving(false);
    }
  }

  if (!entries.length && !focused) {
    return (
      <>
        <Stack.Title>Record Payment</Stack.Title>
        <Stack.Toolbar placement="left"><Stack.Toolbar.Button onPress={() => router.back()}>Cancel</Stack.Toolbar.Button></Stack.Toolbar>
        <NativeFormScreen><Section><NativeEmptyState title="No open obligations" description="There are no unpaid records available in this context." systemImage="checkmark.circle" /></Section></NativeFormScreen>
      </>
    );
  }

  return (
    <>
      <Stack.Title>Record Payment</Stack.Title>
      <FormToolbar enabled={valid} saving={saving} onSave={() => setConfirmationPresented(true)} />
      <NativeFormScreen>
        <Section title="Payment">
          <NativePicker label="Payer" value={payerId} options={availableIds.map((value) => ({ label: participantLabel(value, data.members, data.sharedGroupMembers), value }))} onChange={setPayerId} />
          <NativePicker label="Receiver" value={payeeId} options={availableIds.map((value) => ({ label: participantLabel(value, data.members, data.sharedGroupMembers), value }))} onChange={setPayeeId} />
          <NativeTextField label="Amount" value={amount} onChange={setAmount} keyboard="decimal-pad" />
          <NativePicker label="Currency" value={currency} options={CURRENCIES.map((value) => ({ label: value, value }))} onChange={setCurrency} />
          <NativeDateField label="Date" value={date} onChange={setDate} />
        </Section>
        <Section title="Apply to records" footer={<Text>Any amount left after selected records is kept as an overpayment credit.</Text>}>
          {entries.filter((entry) => entry.currency === currency).map((entry) => (
            <Toggle key={entry.id} label={`${entry.title} · ${entry.remainingAmount} ${entry.currency}`} isOn={selectedIds.includes(entry.id)} onIsOnChange={(enabled) => toggleEntry(entry.id, enabled)} />
          ))}
        </Section>
        <Section title="Notes">
          <NativeTextField label="Optional notes" value={notes} onChange={setNotes} multiline submit="done" />
          {error ? <NativeStatusText destructive>{error}</NativeStatusText> : null}
        </Section>
        <NativeConfirmationDialog title="Record this payment?" message="Debtulator will apply it to the selected obligations and preserve any overpayment as credit." actionLabel="Record Payment" isPresented={confirmationPresented} onPresentedChange={setConfirmationPresented} onConfirm={() => void persist()} />
      </NativeFormScreen>
    </>
  );
}

export function NativeRecurringFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const data = useAppData();
  const template = data.recurringTemplates.find((item) => item.id === id);
  const [type, setType] = useState<RecurringTemplateType>(template?.type ?? "simple_debt");
  const [title, setTitle] = useState(template?.title ?? "");
  const [amount, setAmount] = useState(template ? String(template.amount) : "");
  const [currency, setCurrency] = useState<CurrencyCode>(template?.currency ?? data.settings.baseCurrency);
  const [rule, setRule] = useState(template?.recurrenceRule ?? "monthly");
  const [date, setDate] = useState(template?.nextOccurrenceDate ?? todayIsoDate());
  const [memberId, setMemberId] = useState(template?.memberId ?? data.members.find((item) => !item.archived)?.id ?? "");
  const [groupId, setGroupId] = useState(template?.groupId ?? data.groups.find((item) => !item.archived)?.id ?? "");
  const [direction, setDirection] = useState<DebtDirection>((template?.payload.direction as DebtDirection | undefined) ?? "they_owe_me");
  const [automatic, setAutomatic] = useState(template?.autoGenerate ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = Boolean(title.trim() && Number(amount) > 0 && (type === "simple_debt" ? memberId : groupId));

  async function save() {
    if (!valid || saving) return;
    try {
      setSaving(true);
      setError(null);
      const payload = type === "simple_debt"
        ? { memberId, direction, tags: ["Recurring"] }
        : { groupId, payerId: "me", participantIds: ["me", ...data.groupMembers.filter((item) => item.groupId === groupId).map((item) => item.memberId)], splitMethod: "equal", tags: ["Recurring"] };
      const input = {
        type,
        title: title.trim(),
        amount: Number(amount),
        currency,
        recurrenceRule: rule,
        nextOccurrenceDate: date,
        memberId: type === "simple_debt" ? memberId : null,
        groupId: type === "simple_debt" ? null : groupId,
        autoGenerate: automatic,
        payload,
      };
      if (template) await data.updateRecurringTemplate(template.id, input);
      else await data.createRecurringTemplate({ ...input, startDate: date });
      router.back();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The recurring record could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Stack.Title>{template ? "Edit Recurring" : "New Recurring"}</Stack.Title>
      <FormToolbar enabled={valid} saving={saving} onSave={() => void save()} />
      <NativeFormScreen>
        <Section title="Schedule">
          <NativePicker label="Type" value={type} options={[{ label: "Simple debt", value: "simple_debt" }, { label: "Shared expense", value: "shared_expense" }]} onChange={setType} style="segmented" />
          <NativeTextField label="Title" value={title} onChange={setTitle} />
          <NativeTextField label="Amount" value={amount} onChange={setAmount} keyboard="decimal-pad" />
          <NativePicker label="Currency" value={currency} options={CURRENCIES.map((value) => ({ label: value, value }))} onChange={setCurrency} />
          <NativePicker label="Repeats" value={rule} options={[{ label: "Weekly", value: "weekly" }, { label: "Monthly", value: "monthly" }, { label: "Yearly", value: "yearly" }]} onChange={setRule} />
          <NativeDateField label="Next occurrence" value={date} onChange={setDate} />
          <Toggle label="Create records automatically" isOn={automatic} onIsOnChange={setAutomatic} />
        </Section>
        <Section title={type === "simple_debt" ? "Member" : "Group"}>
          {type === "simple_debt" ? (
            <>
              <NativePicker label="Member" value={memberId} options={data.members.filter((item) => !item.archived).map((item) => ({ label: item.displayName, value: item.id }))} onChange={setMemberId} />
              <NativePicker label="Direction" value={direction} options={[{ label: "They owe me", value: "they_owe_me" }, { label: "I owe them", value: "i_owe_them" }]} onChange={setDirection} style="segmented" />
            </>
          ) : (
            <NativePicker label="Group" value={groupId} options={data.groups.filter((item) => !item.archived).map((item) => ({ label: item.name, value: item.id }))} onChange={setGroupId} />
          )}
          {error ? <NativeStatusText destructive>{error}</NativeStatusText> : null}
        </Section>
      </NativeFormScreen>
    </>
  );
}
