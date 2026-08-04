import { Text } from "@expo/ui/swift-ui";
import { font, foregroundStyle, monospacedDigit } from "@expo/ui/swift-ui/modifiers";

export function NativeCurrencyText({
  amount,
  currency,
  prominence = "body",
}: {
  amount: number;
  currency: string;
  prominence?: "body" | "headline" | "title";
}) {
  const label = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);

  return (
    <Text
      modifiers={[
        font({
          textStyle: prominence === "title" ? "title2" : prominence,
          weight: prominence === "body" ? "regular" : "semibold",
        }),
        foregroundStyle({ type: "hierarchical", style: "primary" }),
        monospacedDigit(),
      ]}
    >
      {label}
    </Text>
  );
}
