import { cn } from "@/lib/cn";

type TournamentHeaderProps = {
  code: string;
  name: string;
  rightSlot?: React.ReactNode;
  maxWidth?: "2xl" | "5xl";
};

export function TournamentHeader({
  code,
  name,
  rightSlot,
  maxWidth = "5xl",
}: TournamentHeaderProps) {
  return (
    <div className="border-b border-zinc-100 bg-white px-6 py-4">
      <div
        className={cn(
          "mx-auto flex items-center justify-between",
          maxWidth === "5xl" ? "max-w-5xl" : "max-w-2xl"
        )}
      >
        <div>
          <span className="font-mono text-xs font-semibold tracking-widest text-zinc-400">
            {code}
          </span>
          <h1 className="text-base font-extrabold leading-tight tracking-tight">{name}</h1>
        </div>
        {rightSlot && <div className="flex items-center gap-2">{rightSlot}</div>}
      </div>
    </div>
  );
}
