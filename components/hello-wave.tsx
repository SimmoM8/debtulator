import Animated from "react-native-reanimated";

import { typography } from "@/src/constants/design";

export function HelloWave() {
  return (
    <Animated.Text
      style={{
        fontSize: typography.size.displaySm,
        lineHeight: typography.line.displayMd,
        marginTop: -6,
        animationName: {
          "50%": { transform: [{ rotate: "25deg" }] },
        },
        animationIterationCount: 4,
        animationDuration: "300ms",
      }}
    >
      👋
    </Animated.Text>
  );
}
