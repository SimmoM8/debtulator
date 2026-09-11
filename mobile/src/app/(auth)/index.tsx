import { Redirect } from "expo-router";

export default function AuthIndexRoute() {
  return <Redirect href="/(auth)/login" />;
}
