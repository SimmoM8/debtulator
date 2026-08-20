import { Redirect, useLocalSearchParams } from 'expo-router';

import { firstRouteParam, routes } from '@/src/presentation/navigation/routes';

export default function LegacySettlementDetailRoute() {
  const query = useLocalSearchParams();
  const id = firstRouteParam(query.id);
  return <Redirect href={id ? routes.debtSettlementDetail(id, query) : routes.debts(query)} />;
}
