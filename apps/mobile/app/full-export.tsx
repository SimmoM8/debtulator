import { Redirect, useLocalSearchParams } from 'expo-router';

import { routes } from '@/src/presentation/navigation/routes';

export default function LegacyFullExportRoute() {
  return <Redirect href={routes.fullExport(useLocalSearchParams())} />;
}
