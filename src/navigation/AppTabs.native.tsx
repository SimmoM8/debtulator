import { NativeTabs } from "expo-router/unstable-native-tabs";
import { colors } from "../theme";

export default function TabsLayout() {
  return (
    <NativeTabs backgroundColor={colors.tabBarBackground}>
      <NativeTabs.Trigger name="home">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>

        <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="debts">
        <NativeTabs.Trigger.Label>Debts</NativeTabs.Trigger.Label>

        <NativeTabs.Trigger.Icon sf="creditcard.fill" md="credit_card" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
