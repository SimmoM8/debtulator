import { Redirect, useLocalSearchParams } from 'expo-router';

import { firstRouteParam, routes } from '@/src/presentation/navigation/routes';

export default function LegacyDebtDetailRoute() {
  const query = useLocalSearchParams();
  const id = firstRouteParam(query.id);
  return <Redirect href={id ? routes.debtDetail(id, query) : routes.debts(query)} />;
}
