import { cn } from "@/lib/cn";

type InfoBannerVariant = "warning" | "success" | "info";

type InfoBannerProps = {
  variant: InfoBannerVariant;
  children: React.ReactNode;
  className?: string;
};

export function InfoBanner({ variant, children, className }: InfoBannerProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border px-5 py-3.5 text-sm",
        variant === "warning" && "border-amber-100 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400",
        variant === "success" &&
          "border-emerald-100 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 font-medium",
        variant === "info" && "border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400",
        className,
      )}
    >
      {children}
    </div>
  );
}
