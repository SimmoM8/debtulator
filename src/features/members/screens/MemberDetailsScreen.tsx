import { Stack, useLocalSearchParams } from "expo-router";

import { SolidScreen } from "@/src/components/layout";
import { useMember } from "@/src/features/members/hooks/useMember";

export function MemberDetailsScreen() {
  const params = useLocalSearchParams<{
    memberId?: string;
  }>();

  const memberId = typeof params.memberId === "string" ? params.memberId : null;

  const member = useMember(memberId);

  return (
    <>
      <Stack.Screen
        options={{
          title: member.data?.displayName ?? "Member",
        }}
      />

      <SolidScreen />
    </>
  );
}
