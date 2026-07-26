"use server";

import { createClient } from "@/utils/supabase/server";
import { failure, success, toErrorMessage } from "@/lib/action-result";
import type { ActionResult } from "@/types/board";
import type { CardHistoryRow, HistoryEventType } from "@/types/database";

export async function recordHistory(input: {
  cardId: string;
  actorId: string | null;
  eventType: HistoryEventType;
  summary: string;
}): Promise<void> {
  const supabase = await createClient();
  await supabase.from("card_history").insert({
    card_id: input.cardId,
    actor_id: input.actorId,
    event_type: input.eventType,
    summary: input.summary,
  });
}

export async function fetchCardHistory(
  cardId: string,
): Promise<ActionResult<CardHistoryRow[]>> {
  if (!cardId.trim()) return failure("Card id is required");

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("card_history")
      .select("*")
      .eq("card_id", cardId)
      .order("created_at", { ascending: false });

    if (error) return failure(error.message);
    return success(data ?? []);
  } catch (error) {
    return failure(toErrorMessage(error, "Failed to load history"));
  }
}
