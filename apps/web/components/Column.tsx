"use client";

import { memo } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import type { CardRow, ProfileRow } from "@/types/database";
import type { BoardColumn } from "@/types/board";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/Card";
import { EmptyColumn } from "@/components/EmptyColumn";
import { cn } from "@/lib/utils";

type ColumnProps = {
  column: BoardColumn;
  cards: CardRow[];
  getProfile: (id: string | null | undefined) => ProfileRow | undefined;
  sortable?: boolean;
  onAddCard: (status: BoardColumn["id"]) => void;
  onOpenCard: (id: string) => void;
  onDeleteCard: (id: string) => void;
};

function ColumnShell({
  column,
  cards,
  getProfile,
  onAddCard,
  onOpenCard,
  onDeleteCard,
  sortable,
  setNodeRef,
  isOver,
}: ColumnProps & {
  setNodeRef?: (node: HTMLElement | null) => void;
  isOver?: boolean;
}) {
  return (
    <section
      className={cn(
        "flex min-h-[28rem] flex-col gap-3 rounded-2xl border bg-muted/40 p-4 transition-colors",
        isOver && "border-primary/50 bg-primary/5",
      )}
      aria-label={`${column.title} column`}
    >
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold tracking-tight">{column.title}</h2>
          <Badge variant="secondary" className="rounded-full">
            {cards.length}
          </Badge>
        </div>
      </header>

      <Button
        type="button"
        variant="outline"
        className="justify-start gap-2"
        onClick={() => onAddCard(column.id)}
      >
        <Plus className="size-4" />
        Add Card
      </Button>

      <div ref={setNodeRef} className="flex flex-1 flex-col gap-3">
        {sortable ? (
          <SortableContext
            id={column.id}
            items={cards.map((card) => card.id)}
            strategy={verticalListSortingStrategy}
          >
            <ColumnCards
              cards={cards}
              columnTitle={column.title}
              getProfile={getProfile}
              sortable
              onOpenCard={onOpenCard}
              onDeleteCard={onDeleteCard}
            />
          </SortableContext>
        ) : (
          <ColumnCards
            cards={cards}
            columnTitle={column.title}
            getProfile={getProfile}
            sortable={false}
            onOpenCard={onOpenCard}
            onDeleteCard={onDeleteCard}
          />
        )}
      </div>
    </section>
  );
}

function ColumnCards({
  cards,
  columnTitle,
  getProfile,
  sortable,
  onOpenCard,
  onDeleteCard,
}: {
  cards: CardRow[];
  columnTitle: string;
  getProfile: (id: string | null | undefined) => ProfileRow | undefined;
  sortable: boolean;
  onOpenCard: (id: string) => void;
  onDeleteCard: (id: string) => void;
}) {
  if (cards.length === 0) {
    return <EmptyColumn title={columnTitle} />;
  }

  return cards.map((card) => (
    <Card
      key={card.id}
      card={card}
      assignee={getProfile(card.assignee_id)}
      sortable={sortable}
      onOpen={onOpenCard}
      onDelete={onDeleteCard}
    />
  ));
}

const DroppableColumn = memo(function DroppableColumn(props: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: props.column.id,
    data: {
      type: "column",
      status: props.column.id,
    },
  });

  return <ColumnShell {...props} setNodeRef={setNodeRef} isOver={isOver} />;
});

export const Column = memo(function Column({
  sortable = true,
  ...props
}: ColumnProps) {
  if (!sortable) {
    return <ColumnShell {...props} sortable={false} />;
  }

  return <DroppableColumn {...props} sortable />;
});
