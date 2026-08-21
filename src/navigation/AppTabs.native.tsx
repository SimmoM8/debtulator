import { NativeTabs } from "expo-router/unstable-native-tabs";

export default function TabsLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
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
