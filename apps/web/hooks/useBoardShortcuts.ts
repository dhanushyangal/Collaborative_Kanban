"use client";

import { useEffect } from "react";
import type { CardStatus } from "@/types/database";

type UseBoardShortcutsOptions = {
  enabled?: boolean;
  onNewCard: (status: CardStatus) => void;
};

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tag = target.tagName;
  return (
    target.isContentEditable ||
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT"
  );
}

export function useBoardShortcuts({
  enabled = true,
  onNewCard,
}: UseBoardShortcutsOptions) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handler = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === "n") {
        event.preventDefault();
        onNewCard("todo");
        return;
      }

      if (key === "1") {
        event.preventDefault();
        onNewCard("todo");
        return;
      }

      if (key === "2") {
        event.preventDefault();
        onNewCard("in-progress");
        return;
      }

      if (key === "3") {
        event.preventDefault();
        onNewCard("done");
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [enabled, onNewCard]);
}
