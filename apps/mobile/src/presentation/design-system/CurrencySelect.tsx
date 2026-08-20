import type { StyleProp, ViewStyle } from "react-native";

import { DropdownSelect } from "@/src/presentation/design-system/Primitives";
import { CURRENCIES } from "@debtulator/domain/finance/currencies";
import type { CurrencyCode } from "@debtulator/domain/models";

const CURRENCY_OPTIONS = CURRENCIES.map((currency) => ({
  label: currency,
  value: currency,
}));

export function CurrencySelect({
  value,
  onChange,
  label = "Currency",
  style,
}: {
  value: CurrencyCode;
  onChange: (currency: CurrencyCode) => void;
  label?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <DropdownSelect
      label={label}
      value={value}
      options={CURRENCY_OPTIONS}
      onChange={onChange}
      style={style}
    />
  );
}
