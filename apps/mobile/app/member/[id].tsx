import { Redirect, useLocalSearchParams } from 'expo-router';

import { firstRouteParam, routes } from '@/src/presentation/navigation/routes';

export default function LegacyMemberDetailRoute() {
  const query = useLocalSearchParams();
  const id = firstRouteParam(query.id);
  return <Redirect href={id ? routes.memberDetail(id, query) : routes.members(query)} />;
}
