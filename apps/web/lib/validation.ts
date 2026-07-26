import type { CardStatus } from "@/types/database";

export type ValidationSuccess<T> = {
  ok: true;
  data: T;
};

export type ValidationFailure = {
  ok: false;
  error: string;
  fieldErrors?: Partial<Record<"title" | "description" | "status", string>>;
};

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

const VALID_STATUSES: readonly CardStatus[] = [
  "todo",
  "in-progress",
  "done",
] as const;

export function isCardStatus(value: string): value is CardStatus {
  return (VALID_STATUSES as readonly string[]).includes(value);
}

export function validateCardFields(input: {
  title: string;
  description?: string;
}): ValidationResult<{ title: string; description: string }> {
  const title = input.title.trim();
  const description = (input.description ?? "").trim();
  const fieldErrors: ValidationFailure["fieldErrors"] = {};

  if (!title) {
    fieldErrors.title = "Title is required";
  } else if (title.length > 200) {
    fieldErrors.title = "Title must be 200 characters or fewer";
  }

  if (description.length > 5000) {
    fieldErrors.description = "Description must be 5000 characters or fewer";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      error: fieldErrors.title ?? fieldErrors.description ?? "Invalid input",
      fieldErrors,
    };
  }

  return {
    ok: true,
    data: { title, description },
  };
}

export function validateCreateCardInput(input: {
  title: string;
  description?: string;
  status: string;
}): ValidationResult<{
  title: string;
  description: string;
  status: CardStatus;
}> {
  const fields = validateCardFields(input);
  if (!fields.ok) {
    return fields;
  }

  if (!isCardStatus(input.status)) {
    return {
      ok: false,
      error: "Invalid column status",
      fieldErrors: { status: "Invalid column status" },
    };
  }

  return {
    ok: true,
    data: {
      title: fields.data.title,
      description: fields.data.description,
      status: input.status,
    },
  };
}

export function validateMoveCardInput(input: {
  id: string;
  status: string;
  position: number;
}): ValidationResult<{
  id: string;
  status: CardStatus;
  position: number;
}> {
  if (!input.id.trim()) {
    return { ok: false, error: "Card id is required" };
  }

  if (!isCardStatus(input.status)) {
    return { ok: false, error: "Invalid column status" };
  }

  if (!Number.isInteger(input.position) || input.position < 0) {
    return { ok: false, error: "Position must be a non-negative integer" };
  }

  return {
    ok: true,
    data: {
      id: input.id,
      status: input.status,
      position: input.position,
    },
  };
}
