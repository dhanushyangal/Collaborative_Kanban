import type { CardRow, CardStatus } from "@/types/database";
import type { CardsByStatus } from "@/types/board";
import { BOARD_COLUMNS } from "@/types/board";

export function emptyCardsByStatus(): CardsByStatus {
  return {
    todo: [],
    "in-progress": [],
    done: [],
  };
}

export function groupCardsByStatus(cards: CardRow[]): CardsByStatus {
  const grouped = emptyCardsByStatus();

  for (const card of cards) {
    grouped[card.status].push(card);
  }

  for (const column of BOARD_COLUMNS) {
    grouped[column.id].sort((a, b) => a.position - b.position);
  }

  return grouped;
}

export function cardsFromMap(map: Map<string, CardRow>): CardRow[] {
  return Array.from(map.values()).sort((a, b) => {
    if (a.status === b.status) {
      return a.position - b.position;
    }
    return a.status.localeCompare(b.status);
  });
}

export function cardsToMap(cards: CardRow[]): Map<string, CardRow> {
  return new Map(cards.map((card) => [card.id, card]));
}

export function getNextPosition(
  cards: CardRow[],
  status: CardStatus,
): number {
  const columnCards = cards.filter((card) => card.status === status);
  if (columnCards.length === 0) {
    return 0;
  }
  return Math.max(...columnCards.map((card) => card.position)) + 1;
}

export function applyOptimisticMove(
  cards: Map<string, CardRow>,
  cardId: string,
  toStatus: CardStatus,
  toPosition: number,
): Map<string, CardRow> {
  const source = cards.get(cardId);
  if (!source) {
    return cards;
  }

  const next = new Map(cards);
  const fromStatus = source.status;

  if (fromStatus === toStatus) {
    const column = Array.from(next.values())
      .filter((card) => card.status === toStatus && card.id !== cardId)
      .sort((a, b) => a.position - b.position);

    const clamped = Math.max(0, Math.min(toPosition, column.length));
    column.splice(clamped, 0, { ...source, status: toStatus, position: clamped });

    column.forEach((card, index) => {
      next.set(card.id, { ...card, position: index });
    });

    return next;
  }

  const sourceColumn = Array.from(next.values())
    .filter((card) => card.status === fromStatus && card.id !== cardId)
    .sort((a, b) => a.position - b.position);

  sourceColumn.forEach((card, index) => {
    next.set(card.id, { ...card, position: index });
  });

  const destination = Array.from(next.values())
    .filter((card) => card.status === toStatus && card.id !== cardId)
    .sort((a, b) => a.position - b.position);

  const clamped = Math.max(0, Math.min(toPosition, destination.length));
  destination.splice(clamped, 0, {
    ...source,
    status: toStatus,
    position: clamped,
  });

  destination.forEach((card, index) => {
    next.set(card.id, { ...card, position: index });
  });

  return next;
}

export function columnTitle(status: CardStatus): string {
  return BOARD_COLUMNS.find((column) => column.id === status)?.title ?? status;
}
