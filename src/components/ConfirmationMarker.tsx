import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View } from "react-native";

import { palette, radii } from "@/src/constants/design";

export function ConfirmationMarker({
  status,
}: {
  status: "pending" | "rejected";
}) {
  return (
    <View
      accessible
      accessibilityLabel={
        status === "pending" ? "Awaiting confirmation" : "Rejected"
      }
      style={[
        styles.marker,
        status === "pending" ? styles.pending : styles.rejected,
      ]}
    >
      {status === "rejected" ? (
        <Ionicons name="close" size={9} color={palette.surface} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  marker: {
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
  },
  pending: { width: 8, height: 8, backgroundColor: palette.warning },
  rejected: { width: 14, height: 14, backgroundColor: palette.negative },
});
