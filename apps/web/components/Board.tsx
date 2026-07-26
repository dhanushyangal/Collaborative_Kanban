"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { toast } from "sonner";
import { BOARD_COLUMNS } from "@/types/board";
import type { CardRow, CardStatus } from "@/types/database";
import { isCardStatus } from "@/lib/validation";
import { useRealtimeBoard } from "@/hooks/useRealtimeBoard";
import { usePresence } from "@/hooks/usePresence";
import { useBoardShortcuts } from "@/hooks/useBoardShortcuts";
import { Column } from "@/components/Column";
import { CardPreview } from "@/components/Card";
import { CardModal } from "@/components/CardModal";
import { CardDetails } from "@/components/CardDetails";
import { AppHeader } from "@/components/AppHeader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type BoardProps = {
  initialCards: CardRow[];
};

function subscribeToNothing() {
  return () => undefined;
}

function useHasMounted() {
  return useSyncExternalStore(subscribeToNothing, () => true, () => false);
}

function findContainer(
  cardsByStatus: Record<CardStatus, CardRow[]>,
  id: UniqueIdentifier,
): CardStatus | null {
  if (isCardStatus(String(id))) {
    return String(id) as CardStatus;
  }

  for (const column of BOARD_COLUMNS) {
    if (cardsByStatus[column.id].some((card) => card.id === id)) {
      return column.id;
    }
  }

  return null;
}

export function Board({ initialCards }: BoardProps) {
  const {
    cardsByStatus,
    connectionState,
    createCard,
    updateCard,
    deleteCard,
    moveCard,
    getCard,
  } = useRealtimeBoard({ initialCards });

  const { onlineCount } = usePresence();
  const hasMounted = useHasMounted();

  const [createStatus, setCreateStatus] = useState<CardStatus | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  const selectedCard = selectedCardId ? getCard(selectedCardId) ?? null : null;
  const pendingDeleteCard = pendingDeleteId
    ? getCard(pendingDeleteId) ?? null
    : null;
  const activeCard = activeId ? getCard(String(activeId)) ?? null : null;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const openCreate = useCallback((status: CardStatus) => {
    setCreateStatus(status);
  }, []);

  useBoardShortcuts({
    onNewCard: openCreate,
  });

  const handleCreate = useCallback(
    async (input: {
      title: string;
      description: string;
      status: CardStatus;
    }) => {
      setIsCreating(true);
      const result = await createCard(input);
      setIsCreating(false);

      if (!result.ok) {
        toast.error(result.error);
        return false;
      }

      toast.success("Card created");
      return true;
    },
    [createCard],
  );

  const handleSave = useCallback(
    async (input: { id: string; title: string; description: string }) => {
      setIsSaving(true);
      const result = await updateCard(input);
      setIsSaving(false);

      if (!result.ok) {
        toast.error(result.error);
        return false;
      }

      toast.success("Card saved");
      return true;
    },
    [updateCard],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      setIsDeleting(true);
      const result = await deleteCard(id);
      setIsDeleting(false);

      if (!result.ok) {
        toast.error(result.error);
        return false;
      }

      toast.success("Card deleted");
      return true;
    },
    [deleteCard],
  );

  const requestDelete = useCallback((id: string) => {
    setPendingDeleteId(id);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!pendingDeleteId) {
      return;
    }

    const ok = await handleDelete(pendingDeleteId);
    if (ok) {
      setPendingDeleteId(null);
      if (selectedCardId === pendingDeleteId) {
        setSelectedCardId(null);
      }
    }
  }, [handleDelete, pendingDeleteId, selectedCardId]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over) {
        return;
      }

      const activeContainer = findContainer(cardsByStatus, active.id);
      const overContainer = findContainer(cardsByStatus, over.id);

      if (!activeContainer || !overContainer) {
        return;
      }

      const activeCardRow = getCard(String(active.id));
      if (!activeCardRow) {
        return;
      }

      const overCards = cardsByStatus[overContainer];
      let newIndex = overCards.findIndex((card) => card.id === over.id);

      if (isCardStatus(String(over.id))) {
        newIndex = overCards.length;
      } else if (newIndex === -1) {
        newIndex = overCards.length;
      }

      if (
        activeContainer === overContainer &&
        activeCardRow.position === newIndex
      ) {
        return;
      }

      const result = await moveCard({
        id: activeCardRow.id,
        status: overContainer,
        position: newIndex,
      });

      if (!result.ok) {
        toast.error(result.error);
      }
    },
    [cardsByStatus, getCard, moveCard],
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  const announcements = useMemo(
    () => ({
      onDragStart({ active }: DragStartEvent) {
        const card = getCard(String(active.id));
        return card
          ? `Picked up ${card.title}`
          : "Picked up card";
      },
      onDragOver({ active, over }: DragOverEvent) {
        const card = getCard(String(active.id));
        const container = over ? findContainer(cardsByStatus, over.id) : null;
        if (!card || !container) {
          return;
        }
        const title =
          BOARD_COLUMNS.find((column) => column.id === container)?.title ??
          container;
        return `${card.title} is over ${title}`;
      },
      onDragEnd({ active, over }: DragEndEvent) {
        const card = getCard(String(active.id));
        const container = over ? findContainer(cardsByStatus, over.id) : null;
        if (!card || !container) {
          return "Drag cancelled";
        }
        const title =
          BOARD_COLUMNS.find((column) => column.id === container)?.title ??
          container;
        return `Dropped ${card.title} in ${title}`;
      },
      onDragCancel({ active }: DragEndEvent) {
        const card = getCard(String(active.id));
        return card
          ? `Dragging cancelled for ${card.title}`
          : "Dragging cancelled";
      },
    }),
    [cardsByStatus, getCard],
  );

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <AppHeader
        connectionState={connectionState}
        onlineCount={onlineCount}
      />

      {hasMounted ? (
        <DndContext
          id="kanban-board"
          sensors={sensors}
          collisionDetection={closestCorners}
          accessibility={{ announcements }}
          onDragStart={handleDragStart}
          onDragEnd={(event) => {
            void handleDragEnd(event);
          }}
          onDragCancel={handleDragCancel}
        >
          <div className="grid gap-4 md:grid-cols-3">
            {BOARD_COLUMNS.map((column) => (
              <Column
                key={column.id}
                column={column}
                cards={cardsByStatus[column.id]}
                sortable
                onAddCard={openCreate}
                onOpenCard={setSelectedCardId}
                onDeleteCard={requestDelete}
              />
            ))}
          </div>

          <DragOverlay>
            {activeCard ? <CardPreview card={activeCard} /> : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {BOARD_COLUMNS.map((column) => (
            <Column
              key={column.id}
              column={column}
              cards={cardsByStatus[column.id]}
              sortable={false}
              onAddCard={openCreate}
              onOpenCard={setSelectedCardId}
              onDeleteCard={requestDelete}
            />
          ))}
        </div>
      )}

      <CardModal
        open={createStatus !== null}
        status={createStatus}
        isSubmitting={isCreating}
        onOpenChange={(open) => {
          if (!open) {
            setCreateStatus(null);
          }
        }}
        onCreate={handleCreate}
      />

      <CardDetails
        card={selectedCard}
        open={selectedCardId !== null && selectedCard !== null}
        isSaving={isSaving}
        isDeleting={isDeleting}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedCardId(null);
          }
        }}
        onSave={handleSave}
        onDelete={handleDelete}
      />

      <AlertDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeleteId(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this card?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteCard
                ? `“${pendingDeleteCard.title}” will be removed for every connected user.`
                : "This card will be removed for every connected user."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
