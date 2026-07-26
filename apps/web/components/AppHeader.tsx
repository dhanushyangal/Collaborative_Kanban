"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { ConnectionState } from "@/types/board";

type AppHeaderProps = {
  connectionState: ConnectionState;
  onlineCount: number;
};

function displayName(user: {
  fullName: string | null;
  primaryEmailAddress?: { emailAddress: string } | null;
  username: string | null;
}): string {
  if (user.fullName?.trim()) {
    return user.fullName.trim();
  }

  const email = user.primaryEmailAddress?.emailAddress;
  if (email) {
    return email;
  }

  if (user.username?.trim()) {
    return user.username.trim();
  }

  return "Signed in";
}

export function AppHeader({ connectionState, onlineCount }: AppHeaderProps) {
  const { user, isLoaded } = useUser();

  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Collaborative Kanban
        </h1>
        <p className="text-sm text-muted-foreground">
          Shared realtime board. Shortcuts: N / 1 / 2 / 3 to add cards.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <ConnectionStatus
          connectionState={connectionState}
          onlineCount={onlineCount}
        />
        <ThemeToggle />

        <div className="flex items-center gap-2 rounded-full border bg-card px-2 py-1.5 shadow-xs">
          {isLoaded && user ? (
            <span className="max-w-[12rem] truncate px-1 text-sm font-medium">
              {displayName(user)}
            </span>
          ) : (
            <span className="px-1 text-sm text-muted-foreground">Loading…</span>
          )}
          <UserButton
            appearance={{
              elements: {
                avatarBox: "size-8",
              },
            }}
          />
        </div>
      </div>
    </header>
  );
}
