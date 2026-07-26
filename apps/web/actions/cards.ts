"use server";

import { createClient } from "@/utils/supabase/server";
import { columnTitle } from "@/lib/board";
import { priorityLabel, profileLabel } from "@/lib/ticket";
import { failure, success, toErrorMessage } from "@/lib/action-result";
import {
  validateCreateCardInput,
  validateCardFields,
  validateMoveCardInput,
} from "@/lib/validation";
import { recordHistory } from "@/actions/history";
import { upsertCurrentProfile } from "@/actions/profiles";
import type {
  ActionResult,
  AssignCardInput,
  CreateCardInput,
  MoveCardInput,
  SetPriorityInput,
  UpdateCardInput,
} from "@/types/board";
import type { CardPriority, CardRow, ProfileRow } from "@/types/database";

function isPriority(value: string): value is CardPriority {
  return value === "high" || value === "medium" || value === "low";
}

async function getProfileName(id: string | null): Promise<string> {
  if (!id) return "Unassigned";

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", id)
    .maybeSingle();

  return profileLabel(data as Pick<ProfileRow, "full_name" | "email"> | null);
}

export async function createCard(
  input: CreateCardInput,
): Promise<ActionResult<CardRow>> {
  const validated = validateCreateCardInput(input);
  if (!validated.ok) return failure(validated.error);

  try {
    const profileResult = await upsertCurrentProfile();
    if (!profileResult.ok) return failure(profileResult.error);

    const supabase = await createClient();
    const assigneeId = input.assigneeId ?? null;

    if (assigneeId) {
      const { data: assignee } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", assigneeId)
        .maybeSingle();
      if (!assignee) return failure("Assignee not found");
    }

    const { count, error: countError } = await supabase
      .from("cards")
      .select("*", { count: "exact", head: true })
      .eq("status", validated.data.status);

    if (countError) return failure(countError.message);

    const priority =
      input.priority && isPriority(input.priority) ? input.priority : "medium";

    const { data, error } = await supabase
      .from("cards")
      .insert({
        title: validated.data.title,
        description: validated.data.description,
        status: validated.data.status,
        position: count ?? 0,
        priority,
        reporter_id: profileResult.data.id,
        assignee_id: assigneeId,
      })
      .select()
      .single();

    if (error || !data) {
      return failure(error?.message ?? "Failed to create card");
    }

    await recordHistory({
      cardId: data.id,
      actorId: profileResult.data.id,
      eventType: "created",
      summary: `created this ticket in ${columnTitle(data.status)}`,
    });

    if (assigneeId) {
      await recordHistory({
        cardId: data.id,
        actorId: profileResult.data.id,
        eventType: "assignee_changed",
        summary: `assigned to ${await getProfileName(assigneeId)}`,
      });
    }

    return success(data);
  } catch (error) {
    return failure(toErrorMessage(error, "Failed to create card"));
  }
}

export async function updateCard(
  input: UpdateCardInput,
): Promise<ActionResult<CardRow>> {
  if (!input.id.trim()) return failure("Card id is required");

  const validated = validateCardFields({
    title: input.title,
    description: input.description,
  });
  if (!validated.ok) return failure(validated.error);

  try {
    const profileResult = await upsertCurrentProfile();
    if (!profileResult.ok) return failure(profileResult.error);

    const supabase = await createClient();
    const { data: existing, error: existingError } = await supabase
      .from("cards")
      .select("*")
      .eq("id", input.id)
      .maybeSingle();

    if (existingError) return failure(existingError.message);
    if (!existing) return failure("Card not found");

    const { data, error } = await supabase
      .from("cards")
      .update({
        title: validated.data.title,
        description: validated.data.description,
      })
      .eq("id", input.id)
      .select()
      .single();

    if (error || !data) {
      return failure(error?.message ?? "Failed to update card");
    }

    if (existing.title !== data.title) {
      await recordHistory({
        cardId: data.id,
        actorId: profileResult.data.id,
        eventType: "title_changed",
        summary: `changed the title to “${data.title}”`,
      });
    }

    if (existing.description !== data.description) {
      await recordHistory({
        cardId: data.id,
        actorId: profileResult.data.id,
        eventType: "description_changed",
        summary: "updated the description",
      });
    }

    return success(data);
  } catch (error) {
    return failure(toErrorMessage(error, "Failed to update card"));
  }
}

export async function setCardPriority(
  input: SetPriorityInput,
): Promise<ActionResult<CardRow>> {
  if (!input.id.trim()) return failure("Card id is required");
  if (!isPriority(input.priority)) return failure("Invalid priority");

  try {
    const profileResult = await upsertCurrentProfile();
    if (!profileResult.ok) return failure(profileResult.error);

    const supabase = await createClient();
    const { data: existing, error: existingError } = await supabase
      .from("cards")
      .select("*")
      .eq("id", input.id)
      .maybeSingle();

    if (existingError) return failure(existingError.message);
    if (!existing) return failure("Card not found");
    if (existing.priority === input.priority) return success(existing);

    const { data, error } = await supabase
      .from("cards")
      .update({ priority: input.priority })
      .eq("id", input.id)
      .select()
      .single();

    if (error || !data) {
      return failure(error?.message ?? "Failed to update priority");
    }

    await recordHistory({
      cardId: data.id,
      actorId: profileResult.data.id,
      eventType: "priority_changed",
      summary: `set priority to ${priorityLabel(input.priority)}`,
    });

    return success(data);
  } catch (error) {
    return failure(toErrorMessage(error, "Failed to update priority"));
  }
}

export async function assignCard(
  input: AssignCardInput,
): Promise<ActionResult<CardRow>> {
  if (!input.id.trim()) return failure("Card id is required");

  try {
    const profileResult = await upsertCurrentProfile();
    if (!profileResult.ok) return failure(profileResult.error);

    const supabase = await createClient();

    if (input.assigneeId) {
      const { data: assignee } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", input.assigneeId)
        .maybeSingle();
      if (!assignee) return failure("Assignee not found");
    }

    const { data: existing, error: existingError } = await supabase
      .from("cards")
      .select("*")
      .eq("id", input.id)
      .maybeSingle();

    if (existingError) return failure(existingError.message);
    if (!existing) return failure("Card not found");
    if (existing.assignee_id === input.assigneeId) return success(existing);

    const { data, error } = await supabase
      .from("cards")
      .update({ assignee_id: input.assigneeId })
      .eq("id", input.id)
      .select()
      .single();

    if (error || !data) {
      return failure(error?.message ?? "Failed to assign card");
    }

    await recordHistory({
      cardId: data.id,
      actorId: profileResult.data.id,
      eventType: "assignee_changed",
      summary: input.assigneeId
        ? `assigned to ${await getProfileName(input.assigneeId)}`
        : "unassigned the ticket",
    });

    return success(data);
  } catch (error) {
    return failure(toErrorMessage(error, "Failed to assign card"));
  }
}

export async function deleteCard(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  if (!id.trim()) return failure("Card id is required");

  try {
    const profileResult = await upsertCurrentProfile();
    if (!profileResult.ok) return failure(profileResult.error);

    const supabase = await createClient();
    const { data: existing, error: fetchError } = await supabase
      .from("cards")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) return failure(fetchError.message);
    if (!existing) return failure("Card not found");

    const { error: deleteError } = await supabase
      .from("cards")
      .delete()
      .eq("id", id);

    if (deleteError) return failure(deleteError.message);

    const { data: siblings, error: siblingsError } = await supabase
      .from("cards")
      .select("id, position")
      .eq("status", existing.status)
      .order("position", { ascending: true });

    if (siblingsError) return failure(siblingsError.message);

    for (const [index, sibling] of (siblings ?? []).entries()) {
      if (sibling.position === index) continue;
      const { error } = await supabase
        .from("cards")
        .update({ position: index })
        .eq("id", sibling.id);
      if (error) return failure(error.message);
    }

    return success({ id });
  } catch (error) {
    return failure(toErrorMessage(error, "Failed to delete card"));
  }
}

export async function moveCard(
  input: MoveCardInput,
): Promise<ActionResult<CardRow>> {
  const validated = validateMoveCardInput(input);
  if (!validated.ok) return failure(validated.error);

  try {
    const profileResult = await upsertCurrentProfile();
    if (!profileResult.ok) return failure(profileResult.error);

    const supabase = await createClient();
    const { data: existing } = await supabase
      .from("cards")
      .select("*")
      .eq("id", validated.data.id)
      .maybeSingle();

    const { data, error } = await supabase.rpc("move_card", {
      p_card_id: validated.data.id,
      p_status: validated.data.status,
      p_position: validated.data.position,
    });

    if (error || !data) {
      return failure(error?.message ?? "Failed to move card");
    }

    if (existing && existing.status !== data.status) {
      await recordHistory({
        cardId: data.id,
        actorId: profileResult.data.id,
        eventType: "status_changed",
        summary: `moved to ${columnTitle(data.status)}`,
      });
    }

    return success(data);
  } catch (error) {
    return failure(toErrorMessage(error, "Failed to move card"));
  }
}

export async function fetchCards(): Promise<ActionResult<CardRow[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("cards")
      .select("*")
      .order("status", { ascending: true })
      .order("position", { ascending: true });

    if (error) return failure(error.message);
    return success(data ?? []);
  } catch (error) {
    return failure(toErrorMessage(error, "Failed to load cards"));
  }
}
