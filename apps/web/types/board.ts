import type { CardRow, CardStatus } from "@/types/database";

export type { CardStatus };

export type BoardColumnId = CardStatus;

export type BoardColumn = {
  id: BoardColumnId;
  title: string;
};

export const BOARD_COLUMNS: readonly BoardColumn[] = [
  { id: "todo", title: "To Do" },
  { id: "in-progress", title: "In Progress" },
  { id: "done", title: "Done" },
] as const;

export type ConnectionState = "live" | "reconnecting" | "offline";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type CreateCardInput = {
  title: string;
  description?: string;
  status: CardStatus;
};

export type UpdateCardInput = {
  id: string;
  title: string;
  description: string;
};

export type MoveCardInput = {
  id: string;
  status: CardStatus;
  position: number;
};

export type CardsByStatus = Record<CardStatus, CardRow[]>;
