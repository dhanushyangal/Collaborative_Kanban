"use client";

import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import type { CardRow } from "@/types/database";
import { validateCardFields } from "@/lib/validation";
import { columnTitle } from "@/lib/board";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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

type CardDetailsProps = {
  card: CardRow | null;
  open: boolean;
  isSaving?: boolean;
  isDeleting?: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: {
    id: string;
    title: string;
    description: string;
  }) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
};

function CardDetailsForm({
  card,
  isSaving,
  isDeleting,
  onOpenChange,
  onSave,
  onDelete,
  dirtyRef,
  onRequestClose,
}: {
  card: CardRow;
  isSaving: boolean;
  isDeleting: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: CardDetailsProps["onSave"];
  onDelete: CardDetailsProps["onDelete"];
  dirtyRef: React.MutableRefObject<boolean>;
  onRequestClose: () => void;
}) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description);
  const [titleError, setTitleError] = useState<string | undefined>();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isDirty = title !== card.title || description !== card.description;

  const updateTitle = (value: string) => {
    setTitle(value);
    dirtyRef.current = value !== card.title || description !== card.description;
    if (titleError) {
      setTitleError(undefined);
    }
  };

  const updateDescription = (value: string) => {
    setDescription(value);
    dirtyRef.current = title !== card.title || value !== card.description;
  };

  const handleSave = async () => {
    const validated = validateCardFields({ title, description });
    if (!validated.ok) {
      setTitleError(validated.fieldErrors?.title);
      return;
    }

    const ok = await onSave({
      id: card.id,
      title: validated.data.title,
      description: validated.data.description,
    });

    if (ok) {
      dirtyRef.current = false;
      onOpenChange(false);
    }
  };

  const handleDelete = async () => {
    const ok = await onDelete(card.id);
    if (ok) {
      dirtyRef.current = false;
      setConfirmOpen(false);
      onOpenChange(false);
    }
  };

  return (
    <>
      <SheetHeader>
        <SheetTitle>Card details</SheetTitle>
        <SheetDescription>
          Edit this card. Changes sync to every connected client.
        </SheetDescription>
      </SheetHeader>

      <div className="flex flex-1 flex-col gap-4 px-4">
        <Badge variant="secondary" className="w-fit">
          {columnTitle(card.status)}
        </Badge>

        <div className="grid gap-2">
          <Label htmlFor="details-title">Title</Label>
          <Input
            id="details-title"
            value={title}
            aria-invalid={Boolean(titleError)}
            onChange={(event) => {
              updateTitle(event.target.value);
            }}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                void handleSave();
              }
            }}
          />
          {titleError ? (
            <p className="text-sm text-destructive">{titleError}</p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="details-description">Description</Label>
          <Textarea
            id="details-description"
            value={description}
            rows={8}
            onChange={(event) => updateDescription(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                void handleSave();
              }
            }}
          />
        </div>
      </div>

      <SheetFooter className="gap-2 sm:flex-row sm:justify-between">
        <Button
          type="button"
          variant="destructive"
          onClick={() => setConfirmOpen(true)}
          disabled={isDeleting || isSaving}
        >
          <Trash2 className="size-4" />
          Delete
        </Button>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onRequestClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={!isDirty || isSaving}
          >
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </SheetFooter>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this card?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The card will be removed for every
              connected user.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function CardDetails({
  card,
  open,
  isSaving = false,
  isDeleting = false,
  onOpenChange,
  onSave,
  onDelete,
}: CardDetailsProps) {
  const dirtyRef = useRef(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  const attemptClose = () => {
    if (dirtyRef.current) {
      setDiscardOpen(true);
      return;
    }
    onOpenChange(false);
  };

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            attemptClose();
            return;
          }
          onOpenChange(true);
        }}
      >
        <SheetContent className="flex w-full flex-col sm:max-w-md">
          {card ? (
            <CardDetailsForm
              key={card.id}
              card={card}
              isSaving={isSaving}
              isDeleting={isDeleting}
              onOpenChange={onOpenChange}
              onSave={onSave}
              onDelete={onDelete}
              dirtyRef={dirtyRef}
              onRequestClose={attemptClose}
            />
          ) : null}
        </SheetContent>
      </Sheet>

      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved edits. Closing now will discard them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                dirtyRef.current = false;
                setDiscardOpen(false);
                onOpenChange(false);
              }}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
