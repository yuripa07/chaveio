import { cn } from "@/lib/cn";

type ParticipantAvatarProps = {
  name: string;
  className?: string;
};

export function ParticipantAvatar({ name, className }: ParticipantAvatarProps) {
  return (
    <div
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600",
        className
      )}
    >
      {name[0].toUpperCase()}
    </div>
  );
}
