import { Text } from "@expo/ui/swift-ui";
import {
  accessibilityHidden,
  background,
  clipShape,
  font,
  foregroundStyle,
  frame,
} from "@expo/ui/swift-ui/modifiers";

import { iosBrand } from "@/src/theme/iosBrand";
import { initials } from "@/src/utils/text";

function avatarStyle(name: string) {
  const index = [...name].reduce((hash, character) => hash + character.charCodeAt(0), 0) % 4;
  return [
    { background: iosBrand.selectionBackground, foreground: iosBrand.primaryAction },
    { background: iosBrand.positiveBackground, foreground: iosBrand.positive },
    { background: iosBrand.warningBackground, foreground: iosBrand.warning },
    { background: iosBrand.negativeBackground, foreground: iosBrand.negative },
  ][index];
}

export function DebtulatorAvatar({
  name,
  size = 42,
}: {
  name: string;
  size?: number;
}) {
  const colors = avatarStyle(name);
  return (
    <Text
      modifiers={[
        font({ textStyle: size > 48 ? "title2" : "headline", weight: "bold" }),
        foregroundStyle(colors.foreground),
        frame({ width: size, height: size, alignment: "center" }),
        background(colors.background),
        clipShape("circle"),
        accessibilityHidden(),
      ]}
    >
      {initials(name)}
    </Text>
  );
}
