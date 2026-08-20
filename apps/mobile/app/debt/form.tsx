import { Redirect, useLocalSearchParams } from 'expo-router';

import { routes } from '@/src/presentation/navigation/routes';

export default function LegacyDebtFormRoute() {
  return <Redirect href={routes.debtForm(useLocalSearchParams())} />;
}
