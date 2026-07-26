"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import { addComment, fetchComments } from "@/actions/comments";
import { fetchCardHistory } from "@/actions/history";
import type { CardHistoryRow, CommentRow } from "@/types/database";

export function useTicketActivity(cardId: string | null) {
  const supabase = useMemo(() => createClient(), []);
  const [bundle, setBundle] = useState<{
    cardId: string;
    comments: CommentRow[];
    history: CardHistoryRow[];
  } | null>(null);

  useEffect(() => {
    if (!cardId) return;

    let cancelled = false;

    const channel = supabase
      .channel(`ticket-activity:${cardId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comments",
          filter: `card_id=eq.${cardId}`,
        },
        (payload: RealtimePostgresChangesPayload<CommentRow>) => {
          setBundle((prev) => {
            if (!prev || prev.cardId !== cardId) return prev;

            if (payload.eventType === "INSERT" && payload.new?.id) {
              const row = payload.new as CommentRow;
              if (prev.comments.some((c) => c.id === row.id)) return prev;
              return { ...prev, comments: [...prev.comments, row] };
            }

            if (payload.eventType === "DELETE" && payload.old?.id) {
              return {
                ...prev,
                comments: prev.comments.filter((c) => c.id !== payload.old.id),
              };
            }

            return prev;
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "card_history",
          filter: `card_id=eq.${cardId}`,
        },
        (payload: RealtimePostgresChangesPayload<CardHistoryRow>) => {
          const row = payload.new as CardHistoryRow | undefined;
          if (!row?.id) return;

          setBundle((prev) => {
            if (!prev || prev.cardId !== cardId) return prev;
            if (prev.history.some((h) => h.id === row.id)) return prev;
            return { ...prev, history: [row, ...prev.history] };
          });
        },
      )
      .subscribe();

    void Promise.all([fetchComments(cardId), fetchCardHistory(cardId)]).then(
      ([commentsResult, historyResult]) => {
        if (cancelled) return;
        setBundle({
          cardId,
          comments: commentsResult.ok ? commentsResult.data : [],
          history: historyResult.ok ? historyResult.data : [],
        });
      },
    );

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [cardId, supabase]);

  const active =
    cardId && bundle?.cardId === cardId ? bundle : null;

  const postComment = useCallback(
    async (body: string) => {
      if (!cardId) return { ok: false as const, error: "No card selected" };
      return addComment({ cardId, body });
    },
    [cardId],
  );

  return {
    comments: active?.comments ?? [],
    history: active?.history ?? [],
    loading: Boolean(cardId) && !active,
    postComment,
  };
}
