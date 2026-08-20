import { Redirect, useLocalSearchParams } from 'expo-router';

import { routes } from '@/src/presentation/navigation/routes';

export default function LegacyBackupRoute() {
  return <Redirect href={routes.backup(useLocalSearchParams())} />;
}
