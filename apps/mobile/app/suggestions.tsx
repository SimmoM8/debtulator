import { Redirect, useLocalSearchParams } from 'expo-router';

import { routes } from '@/src/presentation/navigation/routes';

export default function LegacySuggestionsRoute() {
  return <Redirect href={routes.suggestions(useLocalSearchParams())} />;
}
