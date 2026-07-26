"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { MessageSquare, Trash2 } from "lucide-react";
import type {
  CardPriority,
  CardRow,
  CardStatus,
  ProfileRow,
} from "@/types/database";
import { BOARD_COLUMNS, CARD_PRIORITIES } from "@/types/board";
import { validateCardFields } from "@/lib/validation";
import { actorLabel, profileLabel, relativeTime, ticketKey } from "@/lib/ticket";
import { useTicketActivity } from "@/hooks/useTicketActivity";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { cn } from "@/lib/utils";

type TicketDialogProps = {
  card: CardRow | null;
  open: boolean;
  profiles: ProfileRow[];
  getProfile: (id: string | null | undefined) => ProfileRow | undefined;
  isSaving?: boolean;
  isDeleting?: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: {
    id: string;
    title: string;
    description: string;
  }) => Promise<boolean>;
  onAssign: (input: {
    id: string;
    assigneeId: string | null;
  }) => Promise<boolean>;
  onSetPriority: (input: {
    id: string;
    priority: CardPriority;
  }) => Promise<boolean>;
  onMoveStatus: (input: {
    id: string;
    status: CardStatus;
  }) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
};

type Draft = {
  title: string;
  description: string;
};

export function TicketDialog({
  card,
  open,
  profiles,
  getProfile,
  isSaving = false,
  isDeleting = false,
  onOpenChange,
  onSave,
  onAssign,
  onSetPriority,
  onMoveStatus,
  onDelete,
}: TicketDialogProps) {
  const { user } = useUser();
  const [activityTab, setActivityTab] = useState<"comments" | "history">(
    "comments",
  );
  const [draft, setDraft] = useState<Draft | null>(null);
  const [titleError, setTitleError] = useState<string | undefined>();
  const [comment, setComment] = useState("");
  const [commentError, setCommentError] = useState<string | undefined>();
  const [commentActive, setCommentActive] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [posting, setPosting] = useState(false);

  const { comments, history, loading, postComment } = useTicketActivity(
    open && card ? card.id : null,
  );

  if (!card) return null;

  const title = draft?.title ?? card.title;
  const description = draft?.description ?? card.description;
  const dirty =
    draft !== null &&
    (draft.title !== card.title || draft.description !== card.description);

  const reporter = getProfile(card.reporter_id);
  const assignee = getProfile(card.assignee_id);

  const attemptClose = () => {
    if (dirty) {
      setDiscardOpen(true);
      return;
    }
    onOpenChange(false);
  };

  const persist = async () => {
    const validated = validateCardFields({ title, description });
    if (!validated.ok) {
      setTitleError(validated.fieldErrors?.title);
      return false;
    }

    if (
      validated.data.title === card.title &&
      validated.data.description === card.description
    ) {
      setDraft(null);
      return true;
    }

    const ok = await onSave({
      id: card.id,
      title: validated.data.title,
      description: validated.data.description,
    });
    if (ok) setDraft(null);
    return ok;
  };

  const setAssignee = async (assigneeId: string | null) => {
    if (assigneeId === card.assignee_id) return;
    await onAssign({ id: card.id, assigneeId });
  };

  const handleComment = async () => {
    const body = comment.trim();
    if (!body) {
      setCommentError("Comment cannot be empty");
      return;
    }

    setPosting(true);
    const result = await postComment(body);
    setPosting(false);

    if (!result.ok) {
      setCommentError(result.error);
      return;
    }

    setComment("");
    setCommentError(undefined);
    setCommentActive(false);
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            attemptClose();
            return;
          }
          onOpenChange(true);
        }}
      >
        <DialogContent className="flex max-h-[90vh] w-full max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
          <DialogHeader className="border-b px-6 py-4 text-left">
            <DialogDescription className="font-mono text-xs tracking-wide text-muted-foreground">
              {ticketKey(card.ticket_number)}
            </DialogDescription>
            <DialogTitle className="sr-only">Ticket details</DialogTitle>
          </DialogHeader>

          <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[minmax(0,1.6fr)_minmax(16rem,0.9fr)]">
            <div className="min-h-0 space-y-6 overflow-y-auto px-6 py-5">
              <div className="space-y-2">
                <Input
                  value={title}
                  aria-invalid={Boolean(titleError)}
                  className="h-auto border-0 px-0 text-2xl font-semibold shadow-none focus-visible:ring-0"
                  onChange={(event) => {
                    setDraft({
                      title: event.target.value,
                      description: draft?.description ?? card.description,
                    });
                    if (titleError) setTitleError(undefined);
                  }}
                  onBlur={() => {
                    if (dirty) void persist();
                  }}
                />
                {titleError ? (
                  <p className="text-sm text-destructive">{titleError}</p>
                ) : null}
              </div>

              <section className="space-y-2">
                <Label htmlFor="ticket-description">Description</Label>
                <Textarea
                  id="ticket-description"
                  value={description}
                  placeholder="Add a description..."
                  rows={6}
                  className="resize-y"
                  onChange={(event) => {
                    setDraft({
                      title: draft?.title ?? card.title,
                      description: event.target.value,
                    });
                  }}
                  onBlur={() => {
                    if (dirty) void persist();
                  }}
                />
              </section>

              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm font-medium",
                      activityTab === "comments"
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    onClick={() => setActivityTab("comments")}
                  >
                    Comments
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm font-medium",
                      activityTab === "history"
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    onClick={() => setActivityTab("history")}
                  >
                    History
                  </button>
                </div>

                {activityTab === "comments" ? (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      {loading && comments.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Loading comments…
                        </p>
                      ) : null}
                      {!loading && comments.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No comments yet.
                        </p>
                      ) : null}
                      {comments.map((item) => {
                        const author = getProfile(item.author_id);
                        return (
                          <div key={item.id} className="flex gap-3">
                            <UserAvatar profile={author} size="md" />
                            <div className="min-w-0 flex-1 rounded-lg border bg-card p-3">
                              <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <span className="font-medium text-foreground">
                                  {profileLabel(author)}
                                </span>
                                <span>{relativeTime(item.created_at)}</span>
                              </div>
                              <p className="whitespace-pre-wrap text-sm">
                                {item.body}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="rounded-lg border p-3">
                      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                        <MessageSquare className="size-4" />
                        Add a comment
                      </div>
                      <Textarea
                        value={comment}
                        rows={commentActive ? 3 : 2}
                        placeholder="Write a comment…"
                        onFocus={() => setCommentActive(true)}
                        onChange={(event) => {
                          setComment(event.target.value);
                          if (commentError) setCommentError(undefined);
                        }}
                        onBlur={() => {
                          if (!comment.trim() && !posting) {
                            setCommentActive(false);
                          }
                        }}
                      />
                      {commentError ? (
                        <p className="mt-2 text-sm text-destructive">
                          {commentError}
                        </p>
                      ) : null}
                      {commentActive ? (
                        <div className="mt-3 flex justify-end">
                          <Button
                            type="button"
                            size="sm"
                            disabled={posting || !comment.trim()}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => void handleComment()}
                          >
                            {posting ? "Saving…" : "Save"}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {loading && history.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Loading history…
                      </p>
                    ) : null}
                    {!loading && history.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No history yet.
                      </p>
                    ) : null}
                    {history.map((item) => {
                      const actor = getProfile(item.actor_id);
                      return (
                        <div
                          key={item.id}
                          className="flex items-start gap-3 border-b pb-3 last:border-0"
                        >
                          <UserAvatar profile={actor} />
                          <div className="min-w-0 flex-1 text-sm">
                            <p>
                              <span className="font-medium">
                                {actorLabel(actor)}
                              </span>{" "}
                              <span className="text-muted-foreground">
                                {item.summary}
                              </span>
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {relativeTime(item.created_at)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>

            <aside className="min-h-0 space-y-5 overflow-y-auto border-t bg-muted/30 px-5 py-5 lg:border-t-0 lg:border-l">
              <div className="space-y-2">
                <Label htmlFor="ticket-status">Status</Label>
                <select
                  id="ticket-status"
                  className="flex h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={card.status}
                  disabled={isSaving}
                  onChange={(event) => {
                    const status = event.target.value as CardStatus;
                    if (status !== card.status) {
                      void onMoveStatus({ id: card.id, status });
                    }
                  }}
                >
                  {BOARD_COLUMNS.map((column) => (
                    <option key={column.id} value={column.id}>
                      {column.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3 rounded-xl border bg-card p-4">
                <h3 className="text-sm font-semibold">Details</h3>

                <div className="space-y-1.5">
                  <Label htmlFor="ticket-priority">Priority</Label>
                  <select
                    id="ticket-priority"
                    className="flex h-9 w-full rounded-md border bg-background px-3 text-sm"
                    value={card.priority}
                    disabled={isSaving}
                    onChange={(event) => {
                      const priority = event.target.value as CardPriority;
                      if (priority !== card.priority) {
                        void onSetPriority({ id: card.id, priority });
                      }
                    }}
                  >
                    {CARD_PRIORITIES.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ticket-assignee">Assignee</Label>
                  <select
                    id="ticket-assignee"
                    className="flex h-9 w-full rounded-md border bg-background px-3 text-sm"
                    value={card.assignee_id ?? ""}
                    disabled={isSaving}
                    onChange={(event) => {
                      void setAssignee(event.target.value || null);
                    }}
                  >
                    <option value="">Unassigned</option>
                    {profiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profileLabel(profile)} ({profile.email})
                      </option>
                    ))}
                  </select>
                  {card.assignee_id ? (
                    <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
                      <UserAvatar profile={assignee} />
                      <span className="truncate">
                        {assignee?.email ?? profileLabel(assignee)}
                      </span>
                    </div>
                  ) : (
                    <p className="pt-1 text-xs text-muted-foreground">
                      No one is assigned yet
                    </p>
                  )}
                  {user?.id && card.assignee_id !== user.id ? (
                    <Button
                      type="button"
                      size="sm"
                      className="mt-2 w-full"
                      disabled={isSaving}
                      onClick={() => void setAssignee(user.id)}
                    >
                      Assign to me
                    </Button>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">
                    Reporter
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <UserAvatar profile={reporter} />
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {reporter ? profileLabel(reporter) : "Unknown"}
                      </p>
                      {reporter ? (
                        <p className="truncate text-xs text-muted-foreground">
                          {reporter.email}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1 text-xs text-muted-foreground">
                <p>Created {relativeTime(card.created_at)}</p>
                <p>Updated {relativeTime(card.updated_at)}</p>
              </div>

              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={isDeleting || isSaving}
                onClick={() => setConfirmOpen(true)}
              >
                <Trash2 className="size-4" />
                Delete
              </Button>
            </aside>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this ticket?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the ticket for everyone on the board.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void (async () => {
                  const ok = await onDelete(card.id);
                  if (ok) {
                    setConfirmOpen(false);
                    onOpenChange(false);
                  }
                })();
              }}
              disabled={isDeleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                setDraft(null);
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
