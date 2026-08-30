import { Stack } from "expo-router";
import { OverviewScreen } from "../../../../features/overview/screens/OverviewScreen";

export default function OverviewRoute() {
  return (
    <>
      <Stack.Screen
        options={{
          title: "Overview",
        }}
      />

      <OverviewScreen />
    </>
  );
}
