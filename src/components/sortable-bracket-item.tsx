"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/cn";
import type { TournamentItem } from "@/types/tournament";

interface Props {
  item: TournamentItem;
  index: number;
}

export function SortableBracketItem({ item, index }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("flex items-center gap-2 text-sm", isDragging && "opacity-40")}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-zinc-300 dark:text-zinc-600 hover:text-zinc-500 dark:hover:text-zinc-400 active:cursor-grabbing"
        aria-label="Arrastar para reordenar"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-zinc-100 dark:bg-zinc-800 text-xxs font-bold text-zinc-500 dark:text-zinc-400">
        {index + 1}
      </span>
      <span className="text-zinc-700 dark:text-zinc-300">{item.name}</span>
    </li>
  );
}
