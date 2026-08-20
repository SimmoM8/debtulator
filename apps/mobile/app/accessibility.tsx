import { Redirect, useLocalSearchParams } from 'expo-router';

import { routes } from '@/src/presentation/navigation/routes';

export default function LegacyAccessibilityRoute() {
  return <Redirect href={routes.accessibility(useLocalSearchParams())} />;
}
