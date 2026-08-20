import { Redirect, useLocalSearchParams } from 'expo-router';

import { routes } from '@/src/presentation/navigation/routes';

export default function LegacyConflictsRoute() {
  return <Redirect href={routes.conflicts(useLocalSearchParams())} />;
}
