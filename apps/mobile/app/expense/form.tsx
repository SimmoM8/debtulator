import { Redirect, useLocalSearchParams } from 'expo-router';

import { routes } from '@/src/presentation/navigation/routes';

export default function LegacyExpenseFormRoute() {
  return <Redirect href={routes.expenseForm(useLocalSearchParams())} />;
}
