"use client";

import { cn } from "@/lib/utils";
import type { ProfileRow } from "@/types/database";

type UserAvatarProps = {
  profile?: Pick<ProfileRow, "full_name" | "email" | "avatar_url"> | null;
  size?: "sm" | "md";
  className?: string;
};

function initials(profile?: UserAvatarProps["profile"]): string {
  if (!profile) return "?";
  const source = profile.full_name.trim() || profile.email;
  const parts = source.split(/\s+/).filter(Boolean);
  const first = parts[0];
  const second = parts[1];
  if (!first) return "?";
  if (!second) return first.slice(0, 2).toUpperCase();
  return `${first[0] ?? ""}${second[0] ?? ""}`.toUpperCase();
}

export function UserAvatar({
  profile,
  size = "sm",
  className,
}: UserAvatarProps) {
  const dimension = size === "sm" ? "size-6 text-[10px]" : "size-8 text-xs";

  if (profile?.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={profile.avatar_url}
        alt={profile.full_name || profile.email}
        className={cn(
          "shrink-0 rounded-full object-cover",
          dimension,
          className,
        )}
      />
    );
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-muted font-medium text-muted-foreground",
        dimension,
        className,
      )}
      aria-hidden
    >
      {initials(profile)}
    </span>
  );
}
