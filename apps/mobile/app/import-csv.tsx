import { Redirect, useLocalSearchParams } from 'expo-router';

import { routes } from '@/src/presentation/navigation/routes';

export default function LegacyImportCsvRoute() {
  return <Redirect href={routes.importCsv(useLocalSearchParams())} />;
}
