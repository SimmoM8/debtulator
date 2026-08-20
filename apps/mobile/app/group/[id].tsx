import { Redirect, useLocalSearchParams } from 'expo-router';

import { firstRouteParam, routes } from '@/src/presentation/navigation/routes';

export default function LegacyGroupDetailRoute() {
  const query = useLocalSearchParams();
  const id = firstRouteParam(query.id);
  return <Redirect href={id ? routes.groupDetail(id, query) : routes.groups(query)} />;
}
