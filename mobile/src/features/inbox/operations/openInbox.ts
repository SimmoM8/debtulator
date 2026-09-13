import { router } from "expo-router";

export function openInbox(): void {
  router.push("/(main)/inbox");
}
