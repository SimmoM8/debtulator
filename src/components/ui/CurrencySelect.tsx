import type { StyleProp, ViewStyle } from "react-native";

import { DropdownSelect } from "@/src/components/ui/Primitives";
import { CURRENCIES } from "@/src/constants/currencies";
import type { CurrencyCode } from "@/src/types/models";

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
