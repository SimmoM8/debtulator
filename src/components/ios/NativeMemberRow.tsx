import { DebtulatorMemberRow } from "@/src/components/ios/DebtulatorRows";
import type { Member } from "@/src/types/models";

export function NativeMemberRow({
  member,
  balance,
  balanceValue,
  onPress,
}: {
  member: Member;
  balance: string;
  balanceValue: number;
  onPress: () => void;
}) {
  const settled = Math.abs(balanceValue) <= 0.005;
  return (
    <DebtulatorMemberRow
      name={member.displayName}
      subtitle={
        member.linkStatus === "linked"
          ? "Linked Debtulator user"
          : member.email || member.phone || "Member"
      }
      amount={balance}
      balanceLabel={settled ? "Settled" : balanceValue > 0 ? "Owes you" : "You owe"}
      tone={settled ? "neutral" : balanceValue > 0 ? "positive" : "negative"}
      linked={member.linkStatus === "linked"}
      onPress={onPress}
    />
  );
}
