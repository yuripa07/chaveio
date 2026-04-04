import { cn } from "@/lib/cn";

export const INPUT_CLASS = cn(
  "w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5",
  "text-sm text-zinc-900 placeholder:text-zinc-400",
  "focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
);

export const PRIMARY_BUTTON_CLASS = cn(
  "w-full rounded-2xl bg-indigo-600 px-5 py-3.5 text-sm font-semibold text-white",
  "shadow-sm shadow-indigo-200 hover:bg-indigo-700 active:scale-[.98] transition",
  "disabled:cursor-not-allowed disabled:opacity-40"
);
