"use client";

import { useEffect, useRef } from "react";
import { UserX, X } from "lucide-react";
import { useLocale } from "@/contexts/locale-context";
import { ErrorAlert } from "@/components/error-alert";
import { Spinner } from "@/components/spinner";
import type { Participant } from "@/types/tournament";

type KickParticipantDialogProps = {
  participant: Participant | null;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
  error: string;
};

export function KickParticipantDialog({
  participant,
  onConfirm,
  onCancel,
  isLoading,
  error,
}: KickParticipantDialogProps) {
  const { t } = useLocale();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (participant) dialogRef.current?.focus();
  }, [participant]);

  if (!participant) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="kick-dialog-title"
        tabIndex={-1}
        onKeyDown={(e) => { if (e.key === "Escape") onCancel(); }}
        className="w-full max-w-sm rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 shadow-xl focus:outline-none"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100">
            <UserX className="h-5 w-5 text-red-600" />
          </div>
          <button
            onClick={onCancel}
            aria-label={t.common.close}
            className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        <h2 id="kick-dialog-title" className="text-base font-bold text-zinc-900 dark:text-zinc-50">
          {t.common.kickTitle}
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {t.common.kickConfirm(participant.displayName)}
        </p>

        {error && <ErrorAlert message={error} className="mt-4" />}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors disabled:opacity-40"
          >
            {t.common.cancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 active:scale-[.98] transition disabled:opacity-40"
          >
            {isLoading && <Spinner size="sm" />}
            {isLoading ? t.common.kicking : t.common.kick}
          </button>
        </div>
      </div>
    </div>
  );
}
