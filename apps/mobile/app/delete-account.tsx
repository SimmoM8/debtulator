import { Redirect, useLocalSearchParams } from 'expo-router';

import { routes } from '@/src/presentation/navigation/routes';

export default function LegacyDeleteAccountRoute() {
  return <Redirect href={routes.deleteAccount(useLocalSearchParams())} />;
}
