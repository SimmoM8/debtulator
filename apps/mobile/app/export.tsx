import { Redirect, useLocalSearchParams } from 'expo-router';

import { routes } from '@/src/presentation/navigation/routes';

export default function LegacyExportRoute() {
  return <Redirect href={routes.exportData(useLocalSearchParams())} />;
}
