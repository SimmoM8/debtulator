import { Redirect, useLocalSearchParams } from 'expo-router';

import { routes } from '@/src/presentation/navigation/routes';

export default function LegacyGroupFormRoute() {
  return <Redirect href={routes.groupForm(useLocalSearchParams())} />;
}
