import { Redirect, useLocalSearchParams } from 'expo-router';

import { routes } from '@/src/presentation/navigation/routes';

export default function IndexRoute() {
  return <Redirect href={routes.home(useLocalSearchParams())} />;
}
