import { NativeNavigationRow } from "@/src/components/ios/NativeRows";
import type { Member } from "@/src/types/models";

export function NativeMemberRow({
  member,
  balance,
  onPress,
}: {
  member: Member;
  balance?: string;
  onPress: () => void;
}) {
  return (
    <NativeNavigationRow
      title={member.displayName}
      subtitle={member.email || member.phone || member.notes || "Member"}
      value={balance}
      systemImage="person.crop.circle"
      onPress={onPress}
      hint={`Opens ${member.displayName}'s member details`}
    />
  );
}
