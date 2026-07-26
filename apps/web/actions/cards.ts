"use server";

import { createClient } from "@/utils/supabase/server";
import {
  validateCreateCardInput,
  validateCardFields,
  validateMoveCardInput,
} from "@/lib/validation";
import type {
  ActionResult,
  CreateCardInput,
  MoveCardInput,
  UpdateCardInput,
} from "@/types/board";
import type { CardRow } from "@/types/database";

function failure(error: string): ActionResult<never> {
  return { ok: false, error };
}

function success<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export async function createCard(
  input: CreateCardInput,
): Promise<ActionResult<CardRow>> {
  const validated = validateCreateCardInput(input);
  if (!validated.ok) {
    return failure(validated.error);
  }

  try {
    const supabase = await createClient();
    const { count, error: countError } = await supabase
      .from("cards")
      .select("*", { count: "exact", head: true })
      .eq("status", validated.data.status);

    if (countError) {
      return failure(countError.message);
    }

    const position = count ?? 0;

    const { data, error } = await supabase
      .from("cards")
      .insert({
        title: validated.data.title,
        description: validated.data.description,
        status: validated.data.status,
        position,
      })
      .select()
      .single();

    if (error || !data) {
      return failure(error?.message ?? "Failed to create card");
    }

    return success(data);
  } catch (error) {
    return failure(
      error instanceof Error ? error.message : "Network error while creating card",
    );
  }
}

export async function updateCard(
  input: UpdateCardInput,
): Promise<ActionResult<CardRow>> {
  if (!input.id.trim()) {
    return failure("Card id is required");
  }

  const validated = validateCardFields({
    title: input.title,
    description: input.description,
  });

  if (!validated.ok) {
    return failure(validated.error);
  }

  try {
    const supabase = await createClient();
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

    return success(data);
  } catch (error) {
    return failure(
      error instanceof Error ? error.message : "Network error while updating card",
    );
  }
}

export async function deleteCard(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  if (!id.trim()) {
    return failure("Card id is required");
  }

  try {
    const supabase = await createClient();

    const { data: existing, error: fetchError } = await supabase
      .from("cards")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      return failure(fetchError.message);
    }

    if (!existing) {
      return failure("Card not found");
    }

    const { error: deleteError } = await supabase
      .from("cards")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return failure(deleteError.message);
    }

    // Compact remaining positions in the column.
    const { data: siblings, error: siblingsError } = await supabase
      .from("cards")
      .select("*")
      .eq("status", existing.status)
      .order("position", { ascending: true });

    if (siblingsError) {
      return failure(siblingsError.message);
    }

    const updates = (siblings ?? []).map((card, index) => ({
      id: card.id,
      title: card.title,
      description: card.description,
      status: card.status,
      position: index,
      created_at: card.created_at,
      updated_at: card.updated_at,
    }));

    if (updates.length > 0) {
      const { error: reorderError } = await supabase.from("cards").upsert(updates);
      if (reorderError) {
        return failure(reorderError.message);
      }
    }

    return success({ id });
  } catch (error) {
    return failure(
      error instanceof Error ? error.message : "Network error while deleting card",
    );
  }
}

export async function moveCard(
  input: MoveCardInput,
): Promise<ActionResult<CardRow>> {
  const validated = validateMoveCardInput(input);
  if (!validated.ok) {
    return failure(validated.error);
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("move_card", {
      p_card_id: validated.data.id,
      p_status: validated.data.status,
      p_position: validated.data.position,
    });

    if (error || !data) {
      return failure(error?.message ?? "Failed to move card");
    }

    return success(data);
  } catch (error) {
    return failure(
      error instanceof Error ? error.message : "Network error while moving card",
    );
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

    if (error) {
      return failure(error.message);
    }

    return success(data ?? []);
  } catch (error) {
    return failure(
      error instanceof Error ? error.message : "Network error while loading cards",
    );
  }
}
