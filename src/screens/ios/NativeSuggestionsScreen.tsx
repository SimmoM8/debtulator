import { Button, HStack, Section, Text, VStack } from "@expo/ui/swift-ui";
import { buttonStyle, font, foregroundStyle } from "@expo/ui/swift-ui/modifiers";
import { Stack, router } from "expo-router";
import { useState } from "react";

import { NativeEmptyState } from "@/src/components/ios/NativeEmptyState";
import { NativeListScreen } from "@/src/components/ios/NativeListScreen";
import { useAppData } from "@/src/state/AppDataProvider";

export function NativeSuggestionsScreen() {
  const data = useAppData();
  const [error, setError] = useState<string | null>(null);
  const active = data.smartSuggestions.filter((item) => item.status === "active");

  async function update(id: string, status: "accepted" | "dismissed") {
    setError(null);
    try {
      await data.setSmartSuggestionStatus(id, status);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The suggestion could not be updated.");
    }
  }

  return (
    <>
      <Stack.Title>Suggestions</Stack.Title>
      <NativeListScreen onRefresh={data.refresh}>
        {error ? (
          <Section title="Could Not Update Suggestion">
            <Text modifiers={[foregroundStyle("red")]}>{error}</Text>
          </Section>
        ) : null}
        <Section>
          {active.length ? (
            active.map((suggestion) => (
              <VStack key={suggestion.id} alignment="leading" spacing={8}>
                <Text modifiers={[font({ textStyle: "headline" })]}>{suggestion.title}</Text>
                <Text
                  modifiers={[
                    font({ textStyle: "body" }),
                    foregroundStyle({ type: "hierarchical", style: "secondary" }),
                  ]}
                >
                  {suggestion.message}
                </Text>
                <HStack spacing={12}>
                  <Button label="Apply" onPress={() => void update(suggestion.id, "accepted")} modifiers={[buttonStyle("borderedProminent")]} />
                  <Button label="Dismiss" onPress={() => void update(suggestion.id, "dismissed")} modifiers={[buttonStyle("bordered")]} />
                  {suggestion.targetId ? (
                    <Button
                      label="Open"
                      onPress={() => {
                        if (suggestion.targetType === "member") {
                          router.push(`/(tabs)/members/member/${suggestion.targetId}` as never);
                        } else if (suggestion.targetType === "recurring_template") {
                          router.push(`/(tabs)/settings/recurring/form?id=${suggestion.targetId}` as never);
                        } else {
                          router.push("/(tabs)/debts" as never);
                        }
                      }}
                      modifiers={[buttonStyle("plain")]}
                    />
                  ) : null}
                </HStack>
              </VStack>
            ))
          ) : (
            <NativeEmptyState
              title="No active suggestions"
              description="Debtulator will surface useful recurring, grouping and cleanup ideas here."
              systemImage="sparkles"
            />
          )}
        </Section>
      </NativeListScreen>
    </>
  );
}
