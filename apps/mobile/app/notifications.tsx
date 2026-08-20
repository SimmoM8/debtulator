import { Redirect, useLocalSearchParams } from 'expo-router';

import { routes } from '@/src/presentation/navigation/routes';

export default function LegacyNotificationsRoute() {
  return <Redirect href={routes.notifications(useLocalSearchParams())} />;
}
