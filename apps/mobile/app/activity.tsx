import { Redirect, useLocalSearchParams } from 'expo-router';

import { routes } from '@/src/presentation/navigation/routes';

export default function LegacyActivityRoute() {
  return <Redirect href={routes.activity(useLocalSearchParams())} />;
}
