import { Inbox } from "lucide-react";

type EmptyColumnProps = {
  title: string;
};

export function EmptyColumn({ title }: EmptyColumnProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/30 px-4 py-10 text-center text-muted-foreground">
      <div className="rounded-full bg-muted p-3">
        <Inbox className="size-5" aria-hidden="true" />
      </div>
      <p className="text-sm font-medium">No cards in {title}</p>
      <p className="text-xs">Add a card to get started</p>
    </div>
  );
}
