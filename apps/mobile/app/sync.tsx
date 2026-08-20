import { Redirect, useLocalSearchParams } from 'expo-router';

import { routes } from '@/src/presentation/navigation/routes';

export default function LegacySyncRoute() {
  return <Redirect href={routes.sync(useLocalSearchParams())} />;
}
