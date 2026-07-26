import type { ActionResult } from "@/types/board";

export function failure(error: string): ActionResult<never> {
  return { ok: false, error };
}

export function success<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function toErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
