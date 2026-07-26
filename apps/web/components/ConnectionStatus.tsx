"use client";

import type { ConnectionState } from "@/types/board";
import { Users } from "lucide-react";
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

  const dot =
    connectionState === "live"
      ? "bg-emerald-500"
      : connectionState === "reconnecting"
        ? "bg-amber-400"
        : "bg-rose-500";

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm" role="status">
      <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5">
        <span className={cn("size-2.5 rounded-full", dot)} aria-hidden />
        <span className="font-medium">{label}</span>
      </div>
      <div className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-muted-foreground">
        <Users className="size-3.5" aria-hidden />
        <span>
          {onlineCount === 1 ? "1 User Online" : `${onlineCount} Users Online`}
        </span>
      </div>
    </div>
  );
}
