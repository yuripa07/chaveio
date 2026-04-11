import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

type SectionHeaderProps = {
  icon: ReactNode;
  label: string;
  count?: number | string;
  className?: string;
};

export function SectionHeader({ icon, label, count, className }: SectionHeaderProps) {
  return (
    <h2
      className={cn(
        "mb-3 flex items-center gap-1.5 text-xxs font-semibold uppercase tracking-wider text-zinc-400",
        className
      )}
    >
      {icon}
      {count !== undefined ? `${label} · ${count}` : label}
    </h2>
  );
}
