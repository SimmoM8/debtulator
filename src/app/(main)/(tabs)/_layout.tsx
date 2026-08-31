import { NativeTabs } from "expo-router/unstable-native-tabs";

import { useAppTheme } from "@/src/theme";

export default function TabsLayout() {
  const theme = useAppTheme();

  return (
    <NativeTabs backgroundColor={theme.colors.tabBarBackground}>
      <NativeTabs.Trigger name="overview">
        <NativeTabs.Trigger.Label>Overview</NativeTabs.Trigger.Label>

        <NativeTabs.Trigger.Icon sf="house.fill" md="overview" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="debts">
        <NativeTabs.Trigger.Label>Debts</NativeTabs.Trigger.Label>

        <NativeTabs.Trigger.Icon sf="creditcard.fill" md="credit_card" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="members">
        <NativeTabs.Trigger.Label>Members</NativeTabs.Trigger.Label>

        <NativeTabs.Trigger.Icon sf="person.2.fill" md="group" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
