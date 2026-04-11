import { cn } from "@/lib/cn";

type ErrorAlertProps = {
  message: string;
  className?: string;
};

export function ErrorAlert({ message, className }: ErrorAlertProps) {
  return (
    <p role="alert" className={cn("rounded-xl bg-red-50 dark:bg-red-950/40 px-4 py-2.5 text-sm text-red-600 dark:text-red-400", className)}>
      {message}
    </p>
  );
}
