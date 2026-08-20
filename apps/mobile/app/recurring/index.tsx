import { Redirect, useLocalSearchParams } from 'expo-router';

import { routes } from '@/src/presentation/navigation/routes';

export default function LegacyRecurringTemplatesRoute() {
  return <Redirect href={routes.recurringTemplates(useLocalSearchParams())} />;
}
