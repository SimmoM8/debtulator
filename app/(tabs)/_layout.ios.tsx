import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useWindowDimensions } from "react-native";

import { IOS_ACCENT } from "@/src/components/ios/NativeScreen";

export default function NativeTabLayout() {
  const { fontScale } = useWindowDimensions();
  const hideVisualLabels = fontScale >= 2;

  return (
    <NativeTabs tintColor={IOS_ACCENT} minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="home" accessibilityLabel="Home tab">
        <NativeTabs.Trigger.Icon sf={{ default: "house", selected: "house.fill" }} />
        <NativeTabs.Trigger.Label hidden={hideVisualLabels}>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="members" accessibilityLabel="Members tab">
        <NativeTabs.Trigger.Icon sf={{ default: "person.2", selected: "person.2.fill" }} />
        <NativeTabs.Trigger.Label hidden={hideVisualLabels}>Members</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="debts" accessibilityLabel="Debts tab">
        <NativeTabs.Trigger.Icon sf={{ default: "creditcard", selected: "creditcard.fill" }} />
        <NativeTabs.Trigger.Label hidden={hideVisualLabels}>Debts</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="groups" accessibilityLabel="Groups tab">
        <NativeTabs.Trigger.Icon sf={{ default: "person.3", selected: "person.3.fill" }} />
        <NativeTabs.Trigger.Label hidden={hideVisualLabels}>Groups</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings" accessibilityLabel="Settings tab">
        <NativeTabs.Trigger.Icon sf={{ default: "gearshape", selected: "gearshape.fill" }} />
        <NativeTabs.Trigger.Label hidden={hideVisualLabels}>Settings</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
