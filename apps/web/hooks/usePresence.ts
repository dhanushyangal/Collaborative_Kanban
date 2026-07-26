"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { createClient } from "@/utils/supabase/client";

type PresenceUser = {
  id: string;
  name: string;
  joinedAt: string;
};

export function usePresence(room = "kanban-board") {
  const supabase = useMemo(() => createClient(), []);
  const { user, isLoaded } = useUser();
  const [onlineCount, setOnlineCount] = useState(1);
  const [fallbackId] = useState(() => crypto.randomUUID());

  const presenceKey = user?.id ?? fallbackId;
  const displayName =
    user?.fullName?.trim() ||
    user?.primaryEmailAddress?.emailAddress ||
    user?.username ||
    "Anonymous";

  useEffect(() => {
    if (!isLoaded) return;

    const channel = supabase.channel(`presence:${room}`, {
      config: {
        presence: { key: presenceKey },
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceUser>();
        setOnlineCount(Math.max(Object.keys(state).length, 1));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            id: presenceKey,
            name: displayName,
            joinedAt: new Date().toISOString(),
          } satisfies PresenceUser);
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [displayName, isLoaded, presenceKey, room, supabase]);

  return { onlineCount };
}
