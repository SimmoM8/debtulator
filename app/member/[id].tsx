import { Redirect, useLocalSearchParams } from "expo-router";

export default function LegacyMemberDetailRoute() {
	const { id } = useLocalSearchParams<{ id: string }>();

	if (!id) {
		return <Redirect href="/(tabs)/members" />;
	}

	return (
		<Redirect
			href={{
				pathname: "/(tabs)/members/member/[id]",
				params: { id },
			}}
		/>
	);
}
