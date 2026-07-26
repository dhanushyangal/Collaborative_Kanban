"use client";

import { useEffect, useMemo, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";

type PresenceUser = {
  id: string;
  joinedAt: string;
};

type PresencePayload = {
  [key: string]: PresenceUser[];
};

export function usePresence(room = "kanban-board") {
  const supabase = useMemo(() => createClient(), []);
  const [onlineCount, setOnlineCount] = useState(1);
  const [userId] = useState(() => crypto.randomUUID());

  useEffect(() => {
    let channel: RealtimeChannel | null = null;

    const syncCount = (state: PresencePayload) => {
      const ids = new Set(Object.keys(state));
      setOnlineCount(Math.max(ids.size, 1));
    };

    channel = supabase.channel(`presence:${room}`, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel?.presenceState<PresenceUser>() ?? {};
        syncCount(state as PresencePayload);
      })
      .on("presence", { event: "join" }, () => {
        const state = channel?.presenceState<PresenceUser>() ?? {};
        syncCount(state as PresencePayload);
      })
      .on("presence", { event: "leave" }, () => {
        const state = channel?.presenceState<PresenceUser>() ?? {};
        syncCount(state as PresencePayload);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel?.track({
            id: userId,
            joinedAt: new Date().toISOString(),
          } satisfies PresenceUser);
        }
      });

    return () => {
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [room, supabase, userId]);

  return {
    onlineCount,
    userId,
  };
}
