import { Redirect, useLocalSearchParams } from 'expo-router';

import { routes } from '@/src/presentation/navigation/routes';

export default function LegacyLanguageRoute() {
  return <Redirect href={routes.language(useLocalSearchParams())} />;
}
