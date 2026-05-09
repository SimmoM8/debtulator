import { router } from "expo-router";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { DebtulatorShieldIllustration } from "@/src/components/illustrations/DebtulatorShieldIllustration";
import { Badge } from "@/src/components/ui/Badges";
import {
    Button,
    Card,
    EmptyState,
    LoadingState,
    PageHeader,
    Screen,
    SectionTitle,
} from "@/src/components/ui/Primitives";
import { palette, spacing, typefaces,
typography,
} from "@/src/constants/design";
import {
    buildSmartSuggestionDrafts,
    type SuggestionDraft,
} from "@/src/services/smartSuggestions";
import { useAppData } from "@/src/state/AppDataProvider";
import { useAuth } from "@/src/state/AuthProvider";
import { todayIsoDate } from "@/src/utils/id";

export function SmartSuggestionsScreen() {
  const data = useAppData();
  const auth = useAuth();
  const suggestions = useMemo(
    () =>
      buildSmartSuggestionDrafts({
        debts: data.debts,
        members: data.members,
        events: data.events,
        entries: data.ledgerEntries,
        sharedEventMembers: data.sharedEventMembers,
        recurringTemplates: data.recurringTemplates,
        persisted: data.smartSuggestions,
      }),
    [
      data.debts,
      data.events,
      data.ledgerEntries,
      data.members,
      data.recurringTemplates,
      data.sharedEventMembers,
      data.smartSuggestions,
    ],
  );

  if (data.loading) {
    return <LoadingState />;
  }

  async function persistDraft(
    draft: SuggestionDraft,
    status: "accepted" | "dismissed",
  ) {
    return data.upsertSmartSuggestion({
      userId: auth.identity.authenticatedUserId,
      suggestionType: draft.suggestionType,
      targetType: draft.targetType,
      targetId: draft.targetId,
      title: draft.title,
      message: draft.message,
      metadata: { ...draft.metadata, key: draft.key },
      status,
    });
  }

  async function accept(draft: SuggestionDraft) {
    if (draft.suggestionType === "event") {
      const debtId = String(draft.metadata.debtId ?? "");
      const eventId = String(draft.metadata.eventId ?? "");
      if (debtId && eventId) {
        await data.updateDebt(debtId, { eventId });
      }
    }
    if (draft.suggestionType === "recurring") {
      const firstDebtId = Array.isArray(draft.metadata.debtIds)
        ? String(draft.metadata.debtIds[0])
        : "";
      const debt = data.debts.find((item) => item.id === firstDebtId);
      if (debt) {
        await data.createRecurringTemplate({
          type: "simple_debt",
          memberId: debt.memberId,
          title: debt.title,
          amount: debt.amount,
          currency: debt.currency,
          recurrenceRule: "FREQ=MONTHLY;INTERVAL=1",
          startDate: todayIsoDate(),
          nextOccurrenceDate: todayIsoDate(),
          autoGenerate: false,
          payload: {
            memberId: debt.memberId,
            direction: debt.direction,
            notes: debt.notes,
            tags: debt.tags,
          },
        });
      }
    }
    await persistDraft(draft, "accepted");
  }

  return (
    <Screen>
      <PageHeader
        eyebrow="Smart suggestions"
        title="Suggestions"
        subtitle="Optional assists for tags, events, duplicates, and recurring patterns. Nothing is changed automatically."
      />

      <Card tone="lavender" style={styles.heroCard}>
        <View style={styles.heroGlow} />
        <View style={styles.heroTop}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroLabel}>Human approval required</Text>
            <Text style={styles.heroTitle}>
              Suggestions surface patterns, but ledger changes still wait for an
              explicit decision.
            </Text>
            <Text style={styles.body}>
              Debtulator can suggest recurring templates, event grouping, or
              duplicate review without silently rewriting history.
            </Text>
          </View>
          <View style={styles.heroArtWrap}>
            <DebtulatorShieldIllustration width={128} height={100} />
          </View>
        </View>
      </Card>

      <Card tone="blue">
        <SectionTitle
          title="How suggestions work"
          subtitle="Suggestions explain their reason and require confirmation."
        />
        <View style={styles.badgeLine}>
          <Badge label="never auto-merge" tone="negative" />
          <Badge label="never auto-apply" tone="amber" />
          <Badge
            label={
              data.settings.smartSuggestionsEnabled ? "enabled" : "disabled"
            }
            tone={
              data.settings.smartSuggestionsEnabled ? "positive" : "neutral"
            }
          />
        </View>
      </Card>

      <Card>
        <SectionTitle
          title="Active suggestions"
          subtitle={`${suggestions.length} suggestions`}
        />
        {suggestions.length ? (
          suggestions.map((suggestion) => (
            <View key={suggestion.key} style={styles.suggestionRow}>
              <View style={styles.badgeLine}>
                <Badge
                  label={suggestion.suggestionType}
                  tone={
                    suggestion.suggestionType === "duplicate" ? "amber" : "blue"
                  }
                />
                {suggestion.targetType ? (
                  <Badge
                    label={String(suggestion.targetType).replaceAll("_", " ")}
                    tone="neutral"
                  />
                ) : null}
              </View>
              <Text style={styles.title}>{suggestion.title}</Text>
              <Text style={styles.body}>{suggestion.message}</Text>
              <View style={styles.actionRow}>
                <Button
                  title="Review"
                  icon="eye"
                  variant="secondary"
                  onPress={() => {
                    if (
                      suggestion.targetType === "debt" &&
                      suggestion.targetId
                    ) {
                      router.push({
                        pathname: "/debt/[id]",
                        params: { id: suggestion.targetId },
                      });
                    } else if (
                      suggestion.targetType === "member" &&
                      suggestion.targetId
                    ) {
                      router.push({
                        pathname: "/member/[id]",
                        params: { id: suggestion.targetId },
                      });
                    } else {
                      router.push("/debts");
                    }
                  }}
                />
                <Button
                  title={
                    suggestion.suggestionType === "duplicate"
                      ? "Keep separate"
                      : "Accept"
                  }
                  icon={
                    suggestion.suggestionType === "duplicate"
                      ? "git-branch"
                      : "checkmark"
                  }
                  disabled={suggestion.suggestionType === "duplicate"}
                  onPress={() => accept(suggestion)}
                />
                <Button
                  title="Dismiss"
                  icon="close"
                  variant="ghost"
                  onPress={() => persistDraft(suggestion, "dismissed")}
                />
              </View>
            </View>
          ))
        ) : (
          <EmptyState
            title="No active suggestions"
            body="Debtulator will show optional suggestions as patterns appear."
          />
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    overflow: "hidden",
  },
  heroGlow: {
    position: "absolute",
    top: -24,
    right: -10,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: "rgba(221,214,254,0.24)",
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.lg,
    flexWrap: "wrap",
  },
  heroCopy: {
    flex: 1,
    minWidth: 220,
    gap: spacing.sm,
  },
  heroLabel: {
    color: palette.muted,
    fontSize: typography.size.sm,
    fontFamily: typefaces.bodyStrong,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  heroTitle: {
    color: palette.ink,
    fontSize: typography.size.h1,
    lineHeight: typography.line.displayMd,
    fontFamily: typefaces.displayMedium,
  },
  heroArtWrap: {
    width: 140,
    height: 110,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.38)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderGlass,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeLine: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  suggestionRow: {
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  title: {
    color: palette.ink,
    fontSize: typography.size.xl,
    fontFamily: typefaces.bodyHeavy,
  },
  body: {
    color: palette.muted,
    fontSize: typography.size.base,
    lineHeight: typography.line.xl,
    fontFamily: typefaces.body,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
});
