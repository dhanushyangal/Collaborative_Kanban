"use client";

import { useState } from "react";
import type { CardStatus } from "@/types/database";
import { validateCardFields } from "@/lib/validation";
import { columnTitle } from "@/lib/board";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type CardModalProps = {
  open: boolean;
  status: CardStatus | null;
  isSubmitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: {
    title: string;
    description: string;
    status: CardStatus;
  }) => Promise<boolean>;
};

function CardModalForm({
  status,
  isSubmitting,
  onOpenChange,
  onCreate,
}: {
  status: CardStatus;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: CardModalProps["onCreate"];
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [titleError, setTitleError] = useState<string | undefined>();

  const handleSubmit = async () => {
    const validated = validateCardFields({ title, description });
    if (!validated.ok) {
      setTitleError(validated.fieldErrors?.title);
      return;
    }

    const ok = await onCreate({
      title: validated.data.title,
      description: validated.data.description,
      status,
    });

    if (ok) {
      onOpenChange(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add card</DialogTitle>
        <DialogDescription>
          Create a new card in {columnTitle(status)}.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-2">
        <div className="grid gap-2">
          <Label htmlFor="card-title">Title</Label>
          <Input
            id="card-title"
            value={title}
            autoFocus
            placeholder="What needs to be done?"
            aria-invalid={Boolean(titleError)}
            onChange={(event) => {
              setTitle(event.target.value);
              if (titleError) {
                setTitleError(undefined);
              }
            }}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                void handleSubmit();
              }
            }}
          />
          {titleError ? (
            <p className="text-sm text-destructive">{titleError}</p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="card-description">Description</Label>
          <Textarea
            id="card-description"
            value={description}
            placeholder="Optional details"
            rows={4}
            onChange={(event) => setDescription(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                void handleSubmit();
              }
            }}
          />
        </div>
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Creating..." : "Create"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function CardModal({
  open,
  status,
  isSubmitting = false,
  onOpenChange,
  onCreate,
}: CardModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {status ? (
          <CardModalForm
            key={`${status}-${String(open)}`}
            status={status}
            isSubmitting={isSubmitting}
            onOpenChange={onOpenChange}
            onCreate={onCreate}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
