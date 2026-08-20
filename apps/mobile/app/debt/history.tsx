import { Redirect, useLocalSearchParams } from 'expo-router';

import { routes } from '@/src/presentation/navigation/routes';

export default function LegacyDebtHistoryRoute() {
  return <Redirect href={routes.debtHistory(useLocalSearchParams())} />;
}
