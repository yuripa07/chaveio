import { cn } from "@/lib/cn";

type ResultIconProps = {
  result: "correct" | "incorrect" | "pending";
  className?: string;
};

export function ResultIcon({ result, className }: ResultIconProps) {
  if (result === "correct") {
    return (
      <svg viewBox="0 0 16 16" fill="currentColor" className={cn("h-5 w-5 text-emerald-500", className)}>
        <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16Zm3.78-9.72a.75.75 0 0 0-1.06-1.06L6.75 9.19 5.28 7.72a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l4.5-4.5Z" />
      </svg>
    );
  }

  if (result === "incorrect") {
    return (
      <svg viewBox="0 0 16 16" fill="currentColor" className={cn("h-5 w-5 text-red-400", className)}>
        <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16Zm-3.28-6.22a.75.75 0 0 0 1.06 1.06L8 9.06l2.22 2.22a.75.75 0 1 0 1.06-1.06L9.06 8l2.22-2.22a.75.75 0 0 0-1.06-1.06L8 6.94 5.78 4.72a.75.75 0 0 0-1.06 1.06L6.94 8l-2.22 2.22Z" />
      </svg>
    );
  }

  return <div className={cn("h-5 w-5 rounded-full border-2 border-zinc-200", className)} />;
}
