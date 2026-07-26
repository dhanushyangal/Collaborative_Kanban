import { BOARD_COLUMNS } from "@/types/board";
import { Skeleton } from "@/components/ui/skeleton";

export function BoardSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-3" aria-busy="true" aria-label="Loading board">
      {BOARD_COLUMNS.map((column) => (
        <div
          key={column.id}
          className="flex min-h-[28rem] flex-col gap-3 rounded-2xl border bg-muted/40 p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-6 w-8 rounded-full" />
          </div>
          <Skeleton className="h-9 w-full" />
          <div className="flex flex-1 flex-col gap-3">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}
