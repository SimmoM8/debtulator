import { Redirect, useLocalSearchParams } from 'expo-router';

import { routes } from '@/src/presentation/navigation/routes';

export default function LegacyMemberFormRoute() {
	return <Redirect href={routes.memberForm(useLocalSearchParams())} />;
}
