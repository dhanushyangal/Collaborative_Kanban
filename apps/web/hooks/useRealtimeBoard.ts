"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import {
  applyOptimisticMove,
  cardsFromMap,
  cardsToMap,
  groupCardsByStatus,
} from "@/lib/board";
import {
  createCard as createCardAction,
  deleteCard as deleteCardAction,
  fetchCards,
  moveCard as moveCardAction,
  updateCard as updateCardAction,
} from "@/actions/cards";
import type {
  ConnectionState,
  CreateCardInput,
  MoveCardInput,
  UpdateCardInput,
} from "@/types/board";
import type { CardRow, CardStatus } from "@/types/database";

type UseRealtimeBoardOptions = {
  initialCards: CardRow[];
};

function subscribeToOnline(onStoreChange: () => void) {
  window.addEventListener("online", onStoreChange);
  window.addEventListener("offline", onStoreChange);
  return () => {
    window.removeEventListener("online", onStoreChange);
    window.removeEventListener("offline", onStoreChange);
  };
}

function getOnlineSnapshot() {
  return navigator.onLine;
}

function getOnlineServerSnapshot() {
  // Assume online during SSR so server HTML matches the first client render.
  return true;
}

function useIsOnline() {
  return useSyncExternalStore(
    subscribeToOnline,
    getOnlineSnapshot,
    getOnlineServerSnapshot,
  );
}

function isCardRow(value: unknown): value is CardRow {
  if (!value || typeof value !== "object") {
    return false;
  }

  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.title === "string" &&
    typeof row.description === "string" &&
    typeof row.status === "string" &&
    typeof row.position === "number"
  );
}

export function useRealtimeBoard({ initialCards }: UseRealtimeBoardOptions) {
  const [cardsMap, setCardsMap] = useState(() => cardsToMap(initialCards));
  const [channelState, setChannelState] = useState<"live" | "reconnecting">(
    "reconnecting",
  );
  const isOnline = useIsOnline();
  const connectionState: ConnectionState = !isOnline
    ? "offline"
    : channelState;
  const supabase = useMemo(() => createClient(), []);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const wasSubscribedRef = useRef(false);

  const cards = useMemo(() => cardsFromMap(cardsMap), [cardsMap]);
  const cardsByStatus = useMemo(() => groupCardsByStatus(cards), [cards]);

  const refetch = useCallback(async () => {
    const result = await fetchCards();
    if (result.ok) {
      setCardsMap(cardsToMap(result.data));
    }
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("board-cards")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cards" },
        (payload: RealtimePostgresChangesPayload<CardRow>) => {
          setCardsMap((previous) => {
            const next = new Map(previous);

            if (payload.eventType === "INSERT" && isCardRow(payload.new)) {
              next.set(payload.new.id, payload.new);
              return next;
            }

            if (payload.eventType === "UPDATE" && isCardRow(payload.new)) {
              next.set(payload.new.id, payload.new);
              return next;
            }

            if (payload.eventType === "DELETE") {
              const oldRow = payload.old as Partial<CardRow> | null;
              if (oldRow?.id) {
                next.delete(oldRow.id);
              }
              return next;
            }

            return previous;
          });
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setChannelState("live");
          // Refetch on every reconnect — Realtime does not replay missed events.
          if (wasSubscribedRef.current) {
            void refetch();
          }
          wasSubscribedRef.current = true;
          return;
        }

        if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          setChannelState("reconnecting");
        }
      });

    channelRef.current = channel;

    return () => {
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [refetch, supabase]);

  const createCard = useCallback(
    async (input: CreateCardInput) => {
      const tempId = `temp-${crypto.randomUUID()}`;
      const snapshot = new Map(cardsMap);
      const optimistic: CardRow = {
        id: tempId,
        title: input.title.trim(),
        description: (input.description ?? "").trim(),
        status: input.status,
        position: cardsByStatus[input.status].length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setCardsMap((previous) => {
        const next = new Map(previous);
        next.set(tempId, optimistic);
        return next;
      });

      const result = await createCardAction(input);

      if (!result.ok) {
        setCardsMap(snapshot);
        return result;
      }

      setCardsMap((previous) => {
        const next = new Map(previous);
        next.delete(tempId);
        next.set(result.data.id, result.data);
        return next;
      });

      return result;
    },
    [cardsByStatus, cardsMap],
  );

  const updateCard = useCallback(
    async (input: UpdateCardInput) => {
      const snapshot = new Map(cardsMap);
      const existing = cardsMap.get(input.id);

      if (existing) {
        setCardsMap((previous) => {
          const next = new Map(previous);
          next.set(input.id, {
            ...existing,
            title: input.title.trim(),
            description: input.description.trim(),
            updated_at: new Date().toISOString(),
          });
          return next;
        });
      }

      const result = await updateCardAction(input);

      if (!result.ok) {
        setCardsMap(snapshot);
        return result;
      }

      setCardsMap((previous) => {
        const next = new Map(previous);
        next.set(result.data.id, result.data);
        return next;
      });

      return result;
    },
    [cardsMap],
  );

  const deleteCard = useCallback(
    async (id: string) => {
      const snapshot = new Map(cardsMap);
      const existing = cardsMap.get(id);

      if (existing) {
        setCardsMap((previous) => {
          const next = new Map(previous);
          next.delete(id);

          const siblings = Array.from(next.values())
            .filter((card) => card.status === existing.status)
            .sort((a, b) => a.position - b.position);

          siblings.forEach((card, index) => {
            next.set(card.id, { ...card, position: index });
          });

          return next;
        });
      }

      const result = await deleteCardAction(id);

      if (!result.ok) {
        setCardsMap(snapshot);
      }

      return result;
    },
    [cardsMap],
  );

  const moveCard = useCallback(
    async (input: MoveCardInput) => {
      const snapshot = new Map(cardsMap);

      setCardsMap((previous) =>
        applyOptimisticMove(previous, input.id, input.status, input.position),
      );

      const result = await moveCardAction(input);

      if (!result.ok) {
        setCardsMap(snapshot);
        return result;
      }

      // Authoritative positions arrive via realtime; refresh map with returned row.
      setCardsMap((previous) => {
        const next = applyOptimisticMove(
          previous,
          result.data.id,
          result.data.status,
          result.data.position,
        );
        next.set(result.data.id, result.data);
        return next;
      });

      return result;
    },
    [cardsMap],
  );

  const getCard = useCallback(
    (id: string) => cardsMap.get(id),
    [cardsMap],
  );

  return {
    cards,
    cardsByStatus,
    connectionState,
    createCard,
    updateCard,
    deleteCard,
    moveCard,
    getCard,
    refetch,
  };
}

export type RealtimeBoardApi = ReturnType<typeof useRealtimeBoard>;

export type MoveTarget = {
  status: CardStatus;
  position: number;
};
