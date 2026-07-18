import { Button, Section, Text, Toggle } from "@expo/ui/swift-ui";
import { buttonStyle, disabled } from "@expo/ui/swift-ui/modifiers";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";

import { NativeConfirmationDialog } from "@/src/components/ios/NativeConfirmationDialog";
import {
  NativePicker,
  NativeSecureTextField,
  NativeTextField,
} from "@/src/components/ios/NativeFormControls";
import { NativeFormScreen } from "@/src/components/ios/NativeFormScreen";
import { NativeListScreen } from "@/src/components/ios/NativeListScreen";
import {
  NativeBodyCopy,
  NativeInfoRow,
  NativeStatusText,
} from "@/src/components/ios/NativeRows";
import { CURRENCIES } from "@/src/constants/currencies";
import {
  SUPPORTED_COUNTRIES,
  currencyForCountry,
  type SupportedCountryCode,
} from "@/src/constants/onboarding";
import {
  fetchLatestAccountDeletionRequest,
  getLatestAccountDeletionState,
  requestRemoteAccountDeletion,
  type AccountDeletionRequest,
} from "@/src/services/accountDeletion";
import { useAppData } from "@/src/state/AppDataProvider";
import { useAuth } from "@/src/state/AuthProvider";
import type { CurrencyCode } from "@/src/types/models";

type AuthMode = "signin" | "signup" | "forgot";

export function NativeAuthScreen() {
  const auth = useAuth();
  const data = useAppData();
  const params = useLocalSearchParams<{ mode?: string; firstRun?: string }>();
  const [mode, setMode] = useState<AuthMode>(params.mode === "signup" ? "signup" : params.mode === "forgot" ? "forgot" : "signin");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState<SupportedCountryCode>("SE");
  const [currency, setCurrency] = useState<CurrencyCode>("SEK");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const firstRun = params.firstRun === "1";
  const valid = auth.configured && email.trim().length > 3 &&
    (mode === "forgot" || password.length >= 6) &&
    (mode !== "signup" || Boolean(firstName.trim() && lastName.trim() && phone.trim()));

  async function finish() {
    if (firstRun) await data.updateSettings({ hasCompletedFirstRun: true });
    if (router.canGoBack()) router.back();
    else router.replace("/" as never);
  }

  async function submit() {
    if (!valid || submitting) return;
    try {
      setSubmitting(true);
      setError(null);
      setMessage(null);
      if (mode === "signup") {
        await auth.signUp({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), password, phone: phone.trim(), country, baseCurrency: currency });
        setMessage("Account created. Check your email if confirmation is enabled.");
        await finish();
      } else if (mode === "forgot") {
        await auth.resetPassword(email.trim());
        setMessage("Password reset email sent.");
      } else {
        await auth.signIn({ email: email.trim(), password });
        await finish();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Authentication failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Stack.Title>{mode === "signup" ? "Create Account" : mode === "forgot" ? "Reset Password" : "Sign In"}</Stack.Title>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button onPress={() => router.back()}>Cancel</Stack.Toolbar.Button>
      </Stack.Toolbar>
      <NativeFormScreen>
        <Section title="Account">
          <NativePicker label="Mode" value={mode} options={[{ label: "Sign In", value: "signin" }, { label: "Create Account", value: "signup" }, { label: "Reset Password", value: "forgot" }]} onChange={setMode} style="segmented" />
          {mode === "signup" ? (
            <>
              <NativeTextField label="First name" value={firstName} onChange={setFirstName} contentType="givenName" />
              <NativeTextField label="Last name" value={lastName} onChange={setLastName} contentType="familyName" />
              <NativeTextField label="Mobile" value={phone} onChange={setPhone} keyboard="phone-pad" contentType="telephoneNumber" />
            </>
          ) : null}
          <NativeTextField label="Email" value={email} onChange={setEmail} keyboard="email-address" contentType="emailAddress" />
          {mode !== "forgot" ? <NativeSecureTextField label="Password" value={password} onChange={setPassword} contentType={mode === "signup" ? "newPassword" : "password"} /> : null}
        </Section>
        {mode === "signup" ? (
          <Section title="Region">
            <NativePicker label="Country" value={country} options={SUPPORTED_COUNTRIES.map(({ label, value }) => ({ label, value }))} onChange={(value) => { setCountry(value); setCurrency(currencyForCountry(value)); }} />
            <NativePicker label="Default currency" value={currency} options={CURRENCIES.map((value) => ({ label: value, value }))} onChange={setCurrency} />
          </Section>
        ) : null}
        <Section footer={<Text>Shared groups, member confirmations and account sync require an account.</Text>}>
          <Button label={submitting ? "Working…" : mode === "signup" ? "Create Account" : mode === "forgot" ? "Send Reset Email" : "Sign In"} onPress={() => void submit()} modifiers={[buttonStyle("borderedProminent"), disabled(!valid || submitting)]} />
          {!auth.configured ? <NativeStatusText destructive>Account services are not configured for this build.</NativeStatusText> : null}
          {message ? <NativeStatusText>{message}</NativeStatusText> : null}
          {error ? <NativeStatusText destructive>{error}</NativeStatusText> : null}
        </Section>
      </NativeFormScreen>
    </>
  );
}

export function NativeFirstRunScreen() {
  const data = useAppData();
  const auth = useAuth();
  const [mode, setMode] = useState<"signin" | "local">("signin");
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>(data.settings.baseCurrency);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function continueSetup() {
    try {
      setSubmitting(true);
      setError(null);
      if (mode === "signin") {
        await auth.signIn({ email: email.trim(), password });
        await data.updateSettings({ hasCompletedFirstRun: true });
      } else {
        await data.updateSettings({ localDisplayName: name.trim(), baseCurrency: currency, hasCompletedFirstRun: true });
      }
      router.replace("/" as never);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Setup could not be completed.");
    } finally {
      setSubmitting(false);
    }
  }
  const valid = mode === "signin" ? auth.configured && email.trim().length > 3 && password.length >= 6 : Boolean(name.trim());
  return (
    <>
      <Stack.Title>Welcome to Debtulator</Stack.Title>
      <NativeFormScreen>
        <Section title="Get started" footer={<Text>You can begin locally and sign in later without changing the ledger model.</Text>}>
          <NativePicker label="Setup" value={mode} options={[{ label: "Sign In", value: "signin" }, { label: "Use Locally", value: "local" }]} onChange={setMode} style="segmented" />
        </Section>
        {mode === "signin" ? (
          <Section title="Sign in">
            <NativeTextField label="Email" value={email} onChange={setEmail} keyboard="email-address" contentType="emailAddress" />
            <NativeSecureTextField label="Password" value={password} onChange={setPassword} />
            <Button label="Create an Account Instead" onPress={() => router.push("/auth?mode=signup&firstRun=1" as never)} modifiers={[buttonStyle("plain")]} />
          </Section>
        ) : (
          <Section title="Local setup">
            <NativeTextField label="Your name" value={name} onChange={setName} contentType="name" />
            <NativePicker label="Default currency" value={currency} options={CURRENCIES.map((value) => ({ label: value, value }))} onChange={setCurrency} />
          </Section>
        )}
        <Section>
          <Button label={submitting ? "Setting Up…" : "Continue"} onPress={() => void continueSetup()} modifiers={[buttonStyle("borderedProminent"), disabled(!valid || submitting)]} />
          {error ? <NativeStatusText destructive>{error}</NativeStatusText> : null}
        </Section>
      </NativeFormScreen>
    </>
  );
}

export function NativeDeleteAccountScreen() {
  const data = useAppData();
  const auth = useAuth();
  const userId = auth.identity.authenticatedUserId;
  const [confirmation, setConfirmation] = useState("");
  const [deleteLocalData, setDeleteLocalData] = useState(false);
  const [keepLocalArchive, setKeepLocalArchive] = useState(true);
  const [remoteRequest, setRemoteRequest] = useState<AccountDeletionRequest | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dialogPresented, setDialogPresented] = useState(false);
  const localState = useMemo(() => userId ? getLatestAccountDeletionState(data.auditLogs, userId) : null, [data.auditLogs, userId]);
  const refresh = useCallback(async () => {
    if (!userId) return;
    try { setRemoteRequest(await fetchLatestAccountDeletionRequest(userId)); }
    catch (caught) { setMessage(caught instanceof Error ? caught.message : "Deletion status could not be loaded."); }
  }, [userId]);
  useEffect(() => {
    const timeout = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(timeout);
  }, [refresh]);

  async function requestDeletion() {
    if (!userId || confirmation.trim().toUpperCase() !== "DELETE") return;
    try {
      setSubmitting(true);
      setMessage(null);
      const remote = await requestRemoteAccountDeletion({ deleteLocalData, keepLocalArchive, metadata: { source: "ios-native-delete-account" } });
      const result = await data.submitAccountDeletionRequest({ userId, deleteLocalData, keepLocalArchive });
      if (remote) setRemoteRequest(remote);
      if (result.status === "failed") {
        setMessage(result.failureReason === "unresolved_owned_conflicts" ? "Resolve owned sync conflicts before deleting the account." : "The deletion request failed.");
        return;
      }
      if (deleteLocalData && !keepLocalArchive) await data.resetLocalData();
      setMessage("Deletion request recorded. Shared financial history may be anonymized instead of removed so other ledgers remain consistent.");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "The deletion request could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Stack.Title>Delete Account</Stack.Title>
      <NativeListScreen onRefresh={refresh}>
        <Section title="Before deletion">
          <NativeBodyCopy>Export your data first if you need a copy. Private account data is removed or anonymized; shared financial history may remain in a privacy-conscious form so other participants’ ledgers do not break.</NativeBodyCopy>
          <Button label="Open Full Data Export" onPress={() => router.push("/(tabs)/settings/full-export" as never)} />
        </Section>
        <Section title="Request status">
          <NativeInfoRow label="Account" value={userId ? "Signed in" : "Sign in required"} />
          {remoteRequest ? <NativeInfoRow label="Remote" value={`${remoteRequest.status.replaceAll("_", " ")} · ${remoteRequest.anonymizationStatus.replaceAll("_", " ")}`} /> : null}
          {localState ? <NativeInfoRow label="Local" value={localState.status.replaceAll("_", " ")} /> : null}
          {userId ? <Button label="Refresh Status" systemImage="arrow.clockwise" onPress={() => void refresh()} /> : null}
        </Section>
        <Section title="Local data choice" footer={<Text>Type DELETE exactly before submitting.</Text>}>
          <Toggle label="Keep a local-only archive" isOn={keepLocalArchive} onIsOnChange={setKeepLocalArchive} />
          <Toggle label="Delete local data too" isOn={deleteLocalData} onIsOnChange={setDeleteLocalData} />
          <NativeTextField label="Type DELETE to continue" value={confirmation} onChange={setConfirmation} submit="done" />
          <Button label={submitting ? "Submitting…" : "Request Account Deletion"} role="destructive" onPress={() => setDialogPresented(true)} modifiers={[disabled(!userId || confirmation.trim().toUpperCase() !== "DELETE" || submitting)]} />
          {message ? <NativeStatusText destructive={message.includes("failed") || message.includes("could not")}>{message}</NativeStatusText> : null}
        </Section>
        <NativeConfirmationDialog title="Request account deletion?" message="This begins remote revocation and anonymization. It cannot be undone from this screen." actionLabel="Submit Request" destructive isPresented={dialogPresented} onPresentedChange={setDialogPresented} onConfirm={() => void requestDeletion()} />
      </NativeListScreen>
    </>
  );
}
