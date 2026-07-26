"use client";

import { Users } from "lucide-react";
import type { ConnectionState } from "@/types/board";
import { cn } from "@/lib/utils";

type ConnectionStatusProps = {
  connectionState: ConnectionState;
  onlineCount: number;
};

export function ConnectionStatus({
  connectionState,
  onlineCount,
}: ConnectionStatusProps) {
  const label =
    connectionState === "live"
      ? "Live"
      : connectionState === "reconnecting"
        ? "Reconnecting..."
        : "Offline";

  const indicatorClass =
    connectionState === "live"
      ? "bg-emerald-500"
      : connectionState === "reconnecting"
        ? "bg-amber-400"
        : "bg-rose-500";

  const userLabel = onlineCount === 1 ? "1 User Online" : `${onlineCount} Users Online`;

  return (
    <div
      className="flex flex-wrap items-center gap-2 text-sm"
      role="status"
      aria-live="polite"
    >
      <div
        className={cn(
          "inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 shadow-xs",
        )}
      >
        <span
          className={cn("size-2.5 rounded-full", indicatorClass)}
          aria-hidden="true"
        />
        <span className="font-medium">{label}</span>
      </div>
      <div className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-muted-foreground shadow-xs">
        <Users className="size-3.5" aria-hidden="true" />
        <span>{userLabel}</span>
      </div>
    </div>
  );
}
