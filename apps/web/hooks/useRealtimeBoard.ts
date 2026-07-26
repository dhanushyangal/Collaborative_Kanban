"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
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
import type { CardRow } from "@/types/database";

function useIsOnline() {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener("online", onChange);
      window.addEventListener("offline", onChange);
      return () => {
        window.removeEventListener("online", onChange);
        window.removeEventListener("offline", onChange);
      };
    },
    () => navigator.onLine,
    () => true,
  );
}

function isCardRow(value: unknown): value is CardRow {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.title === "string" &&
    typeof row.description === "string" &&
    typeof row.status === "string" &&
    typeof row.position === "number"
  );
}

export function useRealtimeBoard({ initialCards }: { initialCards: CardRow[] }) {
  const [cardsMap, setCardsMap] = useState(() => cardsToMap(initialCards));
  const [channelState, setChannelState] = useState<"live" | "reconnecting">(
    "reconnecting",
  );
  const isOnline = useIsOnline();
  const connectionState: ConnectionState = !isOnline ? "offline" : channelState;
  const supabase = useMemo(() => createClient(), []);
  const hasConnected = useRef(false);

  const cards = useMemo(() => cardsFromMap(cardsMap), [cardsMap]);
  const cardsByStatus = useMemo(() => groupCardsByStatus(cards), [cards]);

  const refetch = useCallback(async () => {
    const result = await fetchCards();
    if (result.ok) setCardsMap(cardsToMap(result.data));
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("board-cards")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cards" },
        (payload: RealtimePostgresChangesPayload<CardRow>) => {
          setCardsMap((prev) => {
            const next = new Map(prev);

            if (payload.eventType === "INSERT" && isCardRow(payload.new)) {
              next.set(payload.new.id, payload.new);
              return next;
            }

            if (payload.eventType === "UPDATE" && isCardRow(payload.new)) {
              next.set(payload.new.id, payload.new);
              return next;
            }

            if (payload.eventType === "DELETE") {
              const old = payload.old as Partial<CardRow> | null;
              if (old?.id) next.delete(old.id);
              return next;
            }

            return prev;
          });
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setChannelState("live");
          if (hasConnected.current) void refetch();
          hasConnected.current = true;
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

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refetch, supabase]);

  const createCard = useCallback(
    async (input: CreateCardInput) => {
      const tempId = `temp-${crypto.randomUUID()}`;
      const snapshot = new Map(cardsMap);

      setCardsMap((prev) => {
        const next = new Map(prev);
        next.set(tempId, {
          id: tempId,
          title: input.title.trim(),
          description: (input.description ?? "").trim(),
          status: input.status,
          position: cardsByStatus[input.status].length,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        return next;
      });

      const result = await createCardAction(input);
      if (!result.ok) {
        setCardsMap(snapshot);
        return result;
      }

      setCardsMap((prev) => {
        const next = new Map(prev);
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
        setCardsMap((prev) => {
          const next = new Map(prev);
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

      setCardsMap((prev) => {
        const next = new Map(prev);
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
        setCardsMap((prev) => {
          const next = new Map(prev);
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
      if (!result.ok) setCardsMap(snapshot);
      return result;
    },
    [cardsMap],
  );

  const moveCard = useCallback(
    async (input: MoveCardInput) => {
      const snapshot = new Map(cardsMap);

      setCardsMap((prev) =>
        applyOptimisticMove(prev, input.id, input.status, input.position),
      );

      const result = await moveCardAction(input);
      if (!result.ok) {
        setCardsMap(snapshot);
        return result;
      }

      setCardsMap((prev) => {
        const next = applyOptimisticMove(
          prev,
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

  const getCard = useCallback((id: string) => cardsMap.get(id), [cardsMap]);

  return {
    cardsByStatus,
    connectionState,
    createCard,
    updateCard,
    deleteCard,
    moveCard,
    getCard,
  };
}
