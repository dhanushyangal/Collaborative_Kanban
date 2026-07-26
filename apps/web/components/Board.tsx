"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { useUser } from "@clerk/nextjs";
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
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { toast } from "sonner";
import { BOARD_COLUMNS, type BoardFilter } from "@/types/board";
import type {
  CardPriority,
  CardRow,
  CardStatus,
  ProfileRow,
} from "@/types/database";
import { isCardStatus } from "@/lib/validation";
import { groupCardsByStatus } from "@/lib/board";
import { useRealtimeBoard } from "@/hooks/useRealtimeBoard";
import { usePresence } from "@/hooks/usePresence";
import { useProfiles } from "@/hooks/useProfiles";
import { useBoardShortcuts } from "@/hooks/useBoardShortcuts";
import { Column } from "@/components/Column";
import { CardPreview } from "@/components/Card";
import { CardModal } from "@/components/CardModal";
import { TicketDialog } from "@/components/TicketDialog";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
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
  initialProfiles: ProfileRow[];
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

export function Board({ initialCards, initialProfiles }: BoardProps) {
  const { user } = useUser();
  const {
    cards,
    cardsByStatus: allCardsByStatus,
    connectionState,
    createCard,
    updateCard,
    assignCard,
    setPriority,
    deleteCard,
    moveCard,
    getCard,
  } = useRealtimeBoard({ initialCards });

  const { onlineCount } = usePresence();
  const { profiles, getProfile } = useProfiles(initialProfiles);
  const hasMounted = useHasMounted();

  const [filter, setFilter] = useState<BoardFilter>("all");
  const [createStatus, setCreateStatus] = useState<CardStatus | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  const currentUserId = user?.id;

  const visibleCards = useMemo(() => {
    if (filter !== "mine" || !currentUserId) {
      return cards;
    }
    return cards.filter((card) => card.assignee_id === currentUserId);
  }, [cards, currentUserId, filter]);

  const cardsByStatus = useMemo(
    () => groupCardsByStatus(visibleCards),
    [visibleCards],
  );

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
      priority?: CardPriority;
      assigneeId?: string | null;
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
      return true;
    },
    [updateCard],
  );

  const handleAssign = useCallback(
    async (input: {
      id: string;
      assigneeId: string | null;
      onlyIfUnassigned?: boolean;
    }) => {
      setIsSaving(true);
      const result = await assignCard(input);
      setIsSaving(false);
      if (!result.ok) {
        toast.error(result.error);
        return false;
      }
      return true;
    },
    [assignCard],
  );

  const handleSetPriority = useCallback(
    async (input: { id: string; priority: CardPriority }) => {
      setIsSaving(true);
      const result = await setPriority(input);
      setIsSaving(false);
      if (!result.ok) {
        toast.error(result.error);
        return false;
      }
      return true;
    },
    [setPriority],
  );

  const handleMoveStatus = useCallback(
    async (input: { id: string; status: CardStatus }) => {
      const card = getCard(input.id);
      if (!card || card.status === input.status) return true;

      const position = allCardsByStatus[input.status].filter(
        (item) => item.id !== input.id,
      ).length;

      setIsSaving(true);
      const result = await moveCard({
        id: input.id,
        status: input.status,
        position,
      });
      setIsSaving(false);
      if (!result.ok) {
        toast.error(result.error);
        return false;
      }
      return true;
    },
    [allCardsByStatus, getCard, moveCard],
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

      const activeContainer = findContainer(allCardsByStatus, active.id);
      const overContainer = findContainer(allCardsByStatus, over.id);

      if (!activeContainer || !overContainer) {
        return;
      }

      const activeCardRow = getCard(String(active.id));
      if (!activeCardRow) {
        return;
      }

      const overCards = allCardsByStatus[overContainer];
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
    [allCardsByStatus, getCard, moveCard],
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  const announcements = useMemo(
    () => ({
      onDragStart({ active }: DragStartEvent) {
        const card = getCard(String(active.id));
        return card ? `Picked up ${card.title}` : "Picked up card";
      },
      onDragOver({ active, over }: DragOverEvent) {
        const card = getCard(String(active.id));
        const container = over ? findContainer(allCardsByStatus, over.id) : null;
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
        const container = over ? findContainer(allCardsByStatus, over.id) : null;
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
    [allCardsByStatus, getCard],
  );

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <AppHeader
        connectionState={connectionState}
        onlineCount={onlineCount}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
        >
          All tickets
        </Button>
        <Button
          type="button"
          size="sm"
          variant={filter === "mine" ? "default" : "outline"}
          onClick={() => setFilter("mine")}
        >
          Assigned to me
        </Button>
      </div>

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
                getProfile={getProfile}
                sortable
                onAddCard={openCreate}
                onOpenCard={setSelectedCardId}
                onDeleteCard={requestDelete}
              />
            ))}
          </div>
          <DragOverlay>
            {activeCard ? (
              <CardPreview
                card={activeCard}
                assignee={getProfile(activeCard.assignee_id)}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {BOARD_COLUMNS.map((column) => (
            <Column
              key={column.id}
              column={column}
              cards={cardsByStatus[column.id]}
              getProfile={getProfile}
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
        profiles={profiles}
        isSubmitting={isCreating}
        onOpenChange={(open) => {
          if (!open) {
            setCreateStatus(null);
          }
        }}
        onCreate={handleCreate}
      />

      <TicketDialog
        key={selectedCardId ?? "ticket-closed"}
        card={selectedCard}
        open={selectedCard !== null}
        profiles={profiles}
        getProfile={getProfile}
        isSaving={isSaving}
        isDeleting={isDeleting}
        onOpenChange={(open) => {
          if (!open) setSelectedCardId(null);
        }}
        onSave={handleSave}
        onAssign={handleAssign}
        onSetPriority={handleSetPriority}
        onMoveStatus={handleMoveStatus}
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
