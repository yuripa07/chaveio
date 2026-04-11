"use client";

import { useCallback } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/cn";
import { BRACKET_ITEM_HEIGHT } from "@/constants/bracket-layout";
import { ResultIcon } from "@/components/result-icon";
import { useLocale } from "@/contexts/locale-context";
import type { TournamentItem } from "@/types/tournament";

interface Props {
  item: TournamentItem;
  isFirstSlot: boolean;
  isPickable: boolean;
  isSelected: boolean;
  isWinner: boolean;
  isLoser: boolean;
  isDraggingThis: boolean;
  onPick?: () => void;
}

export function ReorderableSlotItem({
  item,
  isFirstSlot,
  isPickable,
  isSelected,
  isWinner,
  isLoser,
  isDraggingThis,
  onPick,
}: Props) {
  const { t } = useLocale();
  const { setNodeRef: setDragRef, listeners, attributes } = useDraggable({ id: item.id });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: item.id });

  const setRef = useCallback(
    (node: HTMLButtonElement | null) => {
      setDragRef(node);
      setDropRef(node);
    },
    [setDragRef, setDropRef]
  );

  return (
    <button
      ref={setRef}
      type="button"
      disabled={!isPickable && !listeners}
      style={{ height: BRACKET_ITEM_HEIGHT }}
      onClick={() => isPickable && onPick?.()}
      className={cn(
        "flex w-full items-center gap-2 px-3 text-left text-sm transition-colors",
        !isFirstSlot && "border-t border-zinc-100 dark:border-zinc-800",
        isDraggingThis && "opacity-40",
        isOver && !isDraggingThis && "ring-2 ring-inset ring-indigo-400",
        isWinner && "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400",
        isLoser && "bg-white dark:bg-zinc-900 text-zinc-300 dark:text-zinc-600",
        isSelected && "bg-indigo-600 text-white",
        !isWinner && !isLoser && !isSelected && isPickable && "hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:text-indigo-700 dark:hover:text-indigo-300 cursor-pointer",
        !isWinner && !isLoser && !isSelected && !isPickable && "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300"
      )}
    >
      <span
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-zinc-300 dark:text-zinc-600 hover:text-zinc-500 dark:hover:text-zinc-400 active:cursor-grabbing shrink-0"
        aria-label={t.bracket.dragToReorder}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </span>
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-xxs font-bold",
          isWinner ? "bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400" : isSelected ? "bg-indigo-500 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500"
        )}
      >
        {item.seed}
      </span>
      <span className={cn("truncate text-sm font-medium", isLoser && "line-through")}>
        {item.name}
      </span>
      {isWinner && (
        <ResultIcon result="correct" className="ml-auto h-4 w-4 shrink-0" />
      )}
    </button>
  );
}
