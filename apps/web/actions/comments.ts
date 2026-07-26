"use server";

import { createClient } from "@/utils/supabase/server";
import { failure, success, toErrorMessage } from "@/lib/action-result";
import { recordHistory } from "@/actions/history";
import { upsertCurrentProfile } from "@/actions/profiles";
import type { ActionResult } from "@/types/board";
import type { CommentRow } from "@/types/database";

export async function fetchComments(
  cardId: string,
): Promise<ActionResult<CommentRow[]>> {
  if (!cardId.trim()) return failure("Card id is required");

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .eq("card_id", cardId)
      .order("created_at", { ascending: true });

    if (error) return failure(error.message);
    return success(data ?? []);
  } catch (error) {
    return failure(toErrorMessage(error, "Failed to load comments"));
  }
}

export async function addComment(input: {
  cardId: string;
  body: string;
}): Promise<ActionResult<CommentRow>> {
  const body = input.body.trim();
  if (!input.cardId.trim()) return failure("Card id is required");
  if (!body) return failure("Comment cannot be empty");
  if (body.length > 2000) {
    return failure("Comment must be 2000 characters or fewer");
  }

  try {
    const profileResult = await upsertCurrentProfile();
    if (!profileResult.ok) return failure(profileResult.error);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("comments")
      .insert({
        card_id: input.cardId,
        author_id: profileResult.data.id,
        body,
      })
      .select()
      .single();

    if (error || !data) {
      return failure(error?.message ?? "Failed to add comment");
    }

    await recordHistory({
      cardId: input.cardId,
      actorId: profileResult.data.id,
      eventType: "comment_added",
      summary: "added a comment",
    });

    return success(data);
  } catch (error) {
    return failure(toErrorMessage(error, "Failed to add comment"));
  }
}
