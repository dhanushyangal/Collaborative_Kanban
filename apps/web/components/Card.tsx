"use client";

import { memo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import type { CardRow } from "@/types/database";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CardProps = {
  card: CardRow;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  sortable?: boolean;
  isDraggingOverlay?: boolean;
};

type CardChromeProps = {
  card: CardRow;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  articleRef?: (node: HTMLElement | null) => void;
  style?: React.CSSProperties;
  isDragging?: boolean;
  isDraggingOverlay?: boolean;
};

function CardChrome({
  card,
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
          <h3 className="line-clamp-2 text-sm font-semibold leading-5">
            {card.title}
          </h3>
          {card.description ? (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {card.description}
            </p>
          ) : null}
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
  onOpen,
  onDelete,
  isDraggingOverlay = false,
}: Omit<CardProps, "sortable">) {
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
    disabled: isDraggingOverlay,
  });

  const style = isDraggingOverlay
    ? undefined
    : {
        transform: CSS.Transform.toString(transform),
        transition,
      };

  return (
    <CardChrome
      card={card}
      onOpen={onOpen}
      onDelete={onDelete}
      articleRef={isDraggingOverlay ? undefined : setNodeRef}
      style={style}
      isDragging={isDragging}
      isDraggingOverlay={isDraggingOverlay}
      dragHandleProps={
        isDraggingOverlay ? undefined : { ...attributes, ...listeners }
      }
    />
  );
});

export const Card = memo(function Card({
  card,
  onOpen,
  onDelete,
  sortable = true,
  isDraggingOverlay = false,
}: CardProps) {
  if (!sortable || isDraggingOverlay) {
    return (
      <CardChrome
        card={card}
        onOpen={onOpen}
        onDelete={onDelete}
        isDraggingOverlay={isDraggingOverlay}
      />
    );
  }

  return (
    <SortableCard
      card={card}
      onOpen={onOpen}
      onDelete={onDelete}
      isDraggingOverlay={isDraggingOverlay}
    />
  );
});

export function CardPreview({ card }: { card: CardRow }) {
  return (
    <Card
      card={card}
      onOpen={() => undefined}
      onDelete={() => undefined}
      isDraggingOverlay
    />
  );
}
