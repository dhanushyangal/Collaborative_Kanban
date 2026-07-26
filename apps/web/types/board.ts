import type { CardPriority, CardRow, CardStatus } from "@/types/database";

export type { CardPriority, CardStatus };

export const CARD_PRIORITIES: readonly {
  id: CardPriority;
  title: string;
}[] = [
  { id: "high", title: "High" },
  { id: "medium", title: "Medium" },
  { id: "low", title: "Low" },
] as const;

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

export type BoardFilter = "all" | "mine";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type CreateCardInput = {
  title: string;
  description?: string;
  status: CardStatus;
  priority?: CardPriority;
  assigneeId?: string | null;
};

export type UpdateCardInput = {
  id: string;
  title: string;
  description: string;
};

export type AssignCardInput = {
  id: string;
  assigneeId: string | null;
};

export type SetPriorityInput = {
  id: string;
  priority: CardPriority;
};

export type MoveCardInput = {
  id: string;
  status: CardStatus;
  position: number;
};

export type CardsByStatus = Record<CardStatus, CardRow[]>;
