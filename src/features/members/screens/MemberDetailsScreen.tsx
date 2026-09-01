import { Stack, useLocalSearchParams } from "expo-router";

import { SolidScreen } from "@/src/components/layout";
import { MemberDetailsHeader } from "@/src/features/members/components/MemberDetailsHeader";
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

      <SolidScreen>
        {member.data ? (
          <MemberDetailsHeader
            member={member.data}
            onAddDebt={() => {
              // Handle add debt action here
            }}
            onSettleUp={() => {
              // Handle settle up action here
            }}
            onPay={() => {
              // Handle pay action here
            }}
            onRemind={() => {
              // Handle remind action here
            }}
          />
        ) : null}
      </SolidScreen>
    </>
  );
}
