import { DebtulatorDebtRow } from "@/src/components/ios/DebtulatorRows";
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
    <DebtulatorDebtRow
      title={debt.title}
      subtitle={member?.displayName ?? "Unknown member"}
      amount={amount}
      direction={debt.direction}
      status={debt.status}
      onPress={onPress}
    />
  );
}
