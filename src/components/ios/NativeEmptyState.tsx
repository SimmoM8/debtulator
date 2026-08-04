import { ContentUnavailableView } from "@expo/ui/swift-ui";
import type { SFSymbol } from "sf-symbols-typescript";

export function NativeEmptyState({
  title,
  description,
  systemImage = "tray",
}: {
  title: string;
  description: string;
  systemImage?: SFSymbol;
}) {
  return (
    <ContentUnavailableView
      title={title}
      description={description}
      systemImage={systemImage}
    />
  );
}
