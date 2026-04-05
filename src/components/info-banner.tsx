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
        variant === "warning" && "border-amber-100 bg-amber-50 text-amber-700",
        variant === "success" &&
          "border-emerald-100 bg-emerald-50 text-emerald-700 font-medium",
        variant === "info" && "border-zinc-100 bg-white text-zinc-500",
        className,
      )}
    >
      {children}
    </div>
  );
}
