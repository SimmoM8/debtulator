import { Redirect, useLocalSearchParams } from 'expo-router';

import { routes } from '@/src/presentation/navigation/routes';

export default function LegacyRecurringTemplateFormRoute() {
  return <Redirect href={routes.recurringTemplateForm(useLocalSearchParams())} />;
}
