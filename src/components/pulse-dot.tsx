import { cn } from "@/lib/cn";

type PulseDotColor = "amber" | "indigo";
type PulseDotSize = "sm" | "md";

type PulseDotProps = {
  color?: PulseDotColor;
  size?: PulseDotSize;
};

export function PulseDot({ color = "indigo", size = "sm" }: PulseDotProps) {
  const dimension = size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2";
  return (
    <span className={cn("relative flex", dimension)}>
      <span
        className={cn(
          "absolute inline-flex h-full w-full motion-safe:animate-ping rounded-full opacity-75",
          color === "amber" ? "bg-amber-400" : "bg-indigo-400"
        )}
      />
      <span
        className={cn(
          "relative inline-flex rounded-full",
          dimension,
          color === "amber" ? "bg-amber-500" : "bg-indigo-500"
        )}
      />
    </span>
  );
}
