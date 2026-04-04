import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/cn";

type TournamentHeaderProps = {
  code: string;
  name: string;
  backHref?: string;
  backLabel?: string;
  rightSlot?: React.ReactNode;
  maxWidth?: "2xl" | "5xl";
};

export function TournamentHeader({
  code,
  name,
  backHref,
  backLabel = "Voltar",
  rightSlot,
  maxWidth = "5xl",
}: TournamentHeaderProps) {
  return (
    <div className="border-b border-zinc-100 bg-white px-6 py-4">
      <div
        className={cn(
          "mx-auto flex items-center gap-3",
          maxWidth === "5xl" ? "max-w-5xl" : "max-w-2xl"
        )}
      >
        {/* Back link */}
        {backHref && (
          <>
            <Link
              href={backHref}
              className="flex shrink-0 items-center gap-1 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">{backLabel}</span>
            </Link>
            <div className="h-5 w-px shrink-0 bg-zinc-200" />
          </>
        )}

        {/* Tournament identity */}
        <div className="flex-1 min-w-0">
          <span className="font-mono text-xs font-semibold tracking-widest text-zinc-400">
            {code}
          </span>
          <h1 className="truncate text-base font-extrabold leading-tight tracking-tight">
            {name}
          </h1>
        </div>

        {/* Right slot */}
        {rightSlot && (
          <div className="flex shrink-0 items-center gap-2">{rightSlot}</div>
        )}
      </div>
    </div>
  );
}
