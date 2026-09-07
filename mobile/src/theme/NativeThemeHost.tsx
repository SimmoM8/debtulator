import { Host } from "@expo/ui";
import type { ComponentProps } from "react";

import { type AppColorScheme, useAppTheme } from "./AppThemeProvider";
import { nativeTheme } from "./nativeTheme";

type HostProps = ComponentProps<typeof Host>;

type NativeThemeHostProps = Omit<HostProps, "seedColor" | "colorScheme"> & {
  colorScheme?: AppColorScheme;
};

export function NativeThemeHost({
  colorScheme,
  ...props
}: NativeThemeHostProps) {
  const theme = useAppTheme();

  return (
    <Host
      {...props}
      seedColor={nativeTheme.seedColor}
      colorScheme={colorScheme ?? theme.scheme}
    />
  );
}
