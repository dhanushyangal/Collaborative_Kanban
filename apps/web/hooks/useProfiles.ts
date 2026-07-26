"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import { fetchProfiles, upsertCurrentProfile } from "@/actions/profiles";
import type { ProfileRow } from "@/types/database";

export function useProfiles(initialProfiles: ProfileRow[]) {
  const { isLoaded, isSignedIn } = useUser();
  const supabase = useMemo(() => createClient(), []);
  const [profiles, setProfiles] = useState(initialProfiles);

  const profileMap = useMemo(
    () => new Map(profiles.map((profile) => [profile.id, profile])),
    [profiles],
  );

  const refresh = useCallback(async () => {
    const result = await fetchProfiles();
    if (result.ok) setProfiles(result.data);
  }, []);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    void (async () => {
      await upsertCurrentProfile();
      await refresh();
    })();
  }, [isLoaded, isSignedIn, refresh]);

  useEffect(() => {
    const channel = supabase
      .channel("board-profiles")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        (payload: RealtimePostgresChangesPayload<ProfileRow>) => {
          setProfiles((prev) => {
            const next = new Map(prev.map((p) => [p.id, p]));
            if (
              (payload.eventType === "INSERT" ||
                payload.eventType === "UPDATE") &&
              payload.new &&
              typeof payload.new === "object" &&
              "id" in payload.new
            ) {
              next.set(payload.new.id, payload.new as ProfileRow);
            }
            if (payload.eventType === "DELETE" && payload.old?.id) {
              next.delete(payload.old.id);
            }
            return Array.from(next.values()).sort((a, b) =>
              a.full_name.localeCompare(b.full_name),
            );
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase]);

  return {
    profiles,
    getProfile: (id: string | null | undefined) =>
      id ? profileMap.get(id) : undefined,
  };
}
