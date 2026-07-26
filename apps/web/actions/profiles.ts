"use server";

import { createClient } from "@/utils/supabase/server";
import { requireAppUser } from "@/lib/auth";
import { failure, success, toErrorMessage } from "@/lib/action-result";
import type { ActionResult } from "@/types/board";
import type { ProfileRow } from "@/types/database";

export async function upsertCurrentProfile(): Promise<ActionResult<ProfileRow>> {
  try {
    const user = await requireAppUser();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          email: user.email,
          full_name: user.fullName,
          avatar_url: user.avatarUrl,
        },
        { onConflict: "id" },
      )
      .select()
      .single();

    if (error || !data) {
      return failure(error?.message ?? "Failed to sync profile");
    }

    return success(data);
  } catch (error) {
    return failure(toErrorMessage(error, "Failed to sync profile"));
  }
}

export async function fetchProfiles(): Promise<ActionResult<ProfileRow[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("full_name", { ascending: true });

    if (error) return failure(error.message);
    return success(data ?? []);
  } catch (error) {
    return failure(toErrorMessage(error, "Failed to load people"));
  }
}
