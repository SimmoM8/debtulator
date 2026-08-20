import { Redirect, useLocalSearchParams } from 'expo-router';

import { routes } from '@/src/presentation/navigation/routes';

export default function LegacyHiddenRequestsRoute() {
  return <Redirect href={routes.requests(useLocalSearchParams())} />;
}
