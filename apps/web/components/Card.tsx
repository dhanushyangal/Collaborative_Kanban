"use client";

import { memo, type CSSProperties, type HTMLAttributes } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import type { CardRow, ProfileRow } from "@/types/database";
import { priorityLabel, ticketKey } from "@/lib/ticket";
import { UserAvatar } from "@/components/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CardProps = {
  card: CardRow;
  assignee?: ProfileRow | null;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  sortable?: boolean;
};

type CardChromeProps = {
  card: CardRow;
  assignee?: ProfileRow | null;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  dragHandleProps?: HTMLAttributes<HTMLButtonElement>;
  articleRef?: (node: HTMLElement | null) => void;
  style?: CSSProperties;
  isDragging?: boolean;
  isDraggingOverlay?: boolean;
};

function CardChrome({
  card,
  assignee,
  onOpen,
  onDelete,
  dragHandleProps,
  articleRef,
  style,
  isDragging = false,
  isDraggingOverlay = false,
}: CardChromeProps) {
  return (
    <article
      ref={articleRef}
      style={style}
      className={cn(
        "group rounded-xl border bg-card p-3 shadow-xs transition-shadow",
        "hover:shadow-md focus-within:ring-2 focus-within:ring-ring",
        isDragging && "opacity-40",
        isDraggingOverlay && "rotate-1 shadow-lg",
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-0.5 cursor-grab touch-none rounded-md p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
          aria-label={`Drag ${card.title}`}
          disabled={!dragHandleProps}
          {...dragHandleProps}
        >
          <GripVertical className="size-4" />
        </button>

        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={() => onOpen(card.id)}
        >
          <div className="mb-1 flex items-center gap-2">
            <p className="font-mono text-[10px] tracking-wide text-muted-foreground">
              {ticketKey(card.ticket_number)}
            </p>
            <Badge
              variant="secondary"
              className={cn(
                "rounded-full px-1.5 py-0 text-[10px]",
                card.priority === "high" &&
                  "bg-rose-500/15 text-rose-600 dark:text-rose-300",
                card.priority === "medium" &&
                  "bg-amber-500/15 text-amber-700 dark:text-amber-300",
                card.priority === "low" &&
                  "bg-sky-500/15 text-sky-700 dark:text-sky-300",
              )}
            >
              {priorityLabel(card.priority)}
            </Badge>
          </div>
          <h3 className="line-clamp-2 text-sm font-semibold leading-5">
            {card.title}
          </h3>
          {card.description ? (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {card.description}
            </p>
          ) : null}
          <div className="mt-2 flex items-center gap-2">
            <UserAvatar profile={assignee} />
            <span className="truncate text-[11px] text-muted-foreground">
              {assignee
                ? assignee.full_name || assignee.email
                : "Unassigned"}
            </span>
          </div>
        </button>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          aria-label={`Delete ${card.title}`}
          onClick={(event) => {
            event.stopPropagation();
            onDelete(card.id);
          }}
        >
          <Trash2 className="size-4 text-destructive" />
        </Button>
      </div>
    </article>
  );
}

const SortableCard = memo(function SortableCard({
  card,
  assignee,
  onOpen,
  onDelete,
}: Omit<CardProps, "sortable" | "isDraggingOverlay">) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: {
      type: "card",
      card,
    },
  });

  return (
    <CardChrome
      card={card}
      assignee={assignee}
      onOpen={onOpen}
      onDelete={onDelete}
      articleRef={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      isDragging={isDragging}
      dragHandleProps={{ ...attributes, ...listeners }}
    />
  );
});

export const Card = memo(function Card({
  card,
  assignee,
  onOpen,
  onDelete,
  sortable = true,
}: CardProps) {
  if (!sortable) {
    return (
      <CardChrome
        card={card}
        assignee={assignee}
        onOpen={onOpen}
        onDelete={onDelete}
      />
    );
  }

  return (
    <SortableCard
      card={card}
      assignee={assignee}
      onOpen={onOpen}
      onDelete={onDelete}
    />
  );
});

export function CardPreview({
  card,
  assignee,
}: {
  card: CardRow;
  assignee?: ProfileRow | null;
}) {
  return (
    <CardChrome
      card={card}
      assignee={assignee}
      onOpen={() => undefined}
      onDelete={() => undefined}
      isDraggingOverlay
    />
  );
}
