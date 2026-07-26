import type { CardRow, CardStatus } from "@/types/database";
import type { CardsByStatus } from "@/types/board";
import { BOARD_COLUMNS } from "@/types/board";

export function groupCardsByStatus(cards: CardRow[]): CardsByStatus {
  const grouped: CardsByStatus = {
    todo: [],
    "in-progress": [],
    done: [],
  };

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
    if (a.status === b.status) return a.position - b.position;
    return a.status.localeCompare(b.status);
  });
}

export function cardsToMap(cards: CardRow[]): Map<string, CardRow> {
  return new Map(cards.map((card) => [card.id, card]));
}

export function applyOptimisticMove(
  cards: Map<string, CardRow>,
  cardId: string,
  toStatus: CardStatus,
  toPosition: number,
): Map<string, CardRow> {
  const source = cards.get(cardId);
  if (!source) return cards;

  const next = new Map(cards);
  const fromStatus = source.status;

  if (fromStatus === toStatus) {
    const column = Array.from(next.values())
      .filter((card) => card.status === toStatus && card.id !== cardId)
      .sort((a, b) => a.position - b.position);

    const index = Math.max(0, Math.min(toPosition, column.length));
    column.splice(index, 0, { ...source, status: toStatus, position: index });
    column.forEach((card, i) => next.set(card.id, { ...card, position: i }));
    return next;
  }

  const sourceColumn = Array.from(next.values())
    .filter((card) => card.status === fromStatus && card.id !== cardId)
    .sort((a, b) => a.position - b.position);

  sourceColumn.forEach((card, i) => next.set(card.id, { ...card, position: i }));

  const destination = Array.from(next.values())
    .filter((card) => card.status === toStatus && card.id !== cardId)
    .sort((a, b) => a.position - b.position);

  const index = Math.max(0, Math.min(toPosition, destination.length));
  destination.splice(index, 0, {
    ...source,
    status: toStatus,
    position: index,
  });
  destination.forEach((card, i) => next.set(card.id, { ...card, position: i }));

  return next;
}

export function columnTitle(status: CardStatus): string {
  return BOARD_COLUMNS.find((c) => c.id === status)?.title ?? status;
}
