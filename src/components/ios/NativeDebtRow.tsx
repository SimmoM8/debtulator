import { NativeNavigationRow } from "@/src/components/ios/NativeRows";
import type { Debt, Member } from "@/src/types/models";

export function NativeDebtRow({
  debt,
  member,
  onPress,
}: {
  debt: Debt;
  member?: Member;
  onPress: () => void;
}) {
  const amount = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: debt.currency,
  }).format(debt.amount);

  return (
    <NativeNavigationRow
      title={debt.title}
      subtitle={`${member?.displayName ?? "Unknown member"} · ${debt.status}`}
      value={amount}
      systemImage={debt.direction === "i_owe_them" ? "arrow.up.right" : "arrow.down.left"}
      onPress={onPress}
      hint={`Opens details for ${debt.title}`}
    />
  );
}
