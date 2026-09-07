import { Avatar } from "@/src/components/avatars/Avatar";

import { componentTokens } from "@/src/theme";

type MemberAvatarProps = {
  displayName: string;
  size?: number;
  variant?: "default" | "onBrand";
};

export function MemberAvatar({
  displayName,
  size = componentTokens.avatar.listSize,
  variant = "default",
}: MemberAvatarProps) {
  return (
    <Avatar initials={getInitials(displayName)} size={size} variant={variant} />
  );
}

function getInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean).slice(0, 2);

  const initials = parts
    .map((part) => part.charAt(0))
    .join("")
    .toLocaleUpperCase();

  return initials || "?";
}
