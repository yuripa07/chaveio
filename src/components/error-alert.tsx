import { cn } from "@/lib/cn";

type ErrorAlertProps = {
  message: string;
  className?: string;
};

export function ErrorAlert({ message, className }: ErrorAlertProps) {
  return (
    <p role="alert" className={cn("rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600", className)}>
      {message}
    </p>
  );
}
