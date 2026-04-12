"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import { ClipboardList, Play, Clock } from "lucide-react";
import { PRIMARY_BUTTON_CLASS } from "@/constants/styles";
import { InfoBanner } from "@/components/info-banner";
import { PulseDot } from "@/components/pulse-dot";
import { Spinner } from "@/components/spinner";
import { useLocale } from "@/contexts/locale-context";
import type { Participant } from "@/types/tournament";

type LobbyCTAProps = {
  code: string;
  participants: Participant[];
  isCreator: boolean;
  hasSubmittedPicks: boolean;
  starting: boolean;
  onStart: () => void;
};

export function LobbyCTA({ code, participants, isCreator, hasSubmittedPicks, starting, onStart }: LobbyCTAProps) {
  const { t } = useLocale();
  const allReady = participants.every((participant) => participant.hasSubmittedPicks);
  const notReadyParticipants = participants.filter((participant) => !participant.hasSubmittedPicks);
  const readyCount = participants.filter((p) => p.hasSubmittedPicks).length;

  return (
    <div className="space-y-3">
      <Link
        href={`/tournament/${code}/bracket`}
        className={cn("flex items-center justify-center gap-2", PRIMARY_BUTTON_CLASS)}
      >
        <ClipboardList className="h-4 w-4" />
        {hasSubmittedPicks ? t.lobbyCTA.editPicks : t.lobbyCTA.makePicks}
      </Link>

      {isCreator && (
        <>
          {!allReady && (
            <InfoBanner variant="warning">
              <Clock className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {t.lobbyCTA.waitingPicksFrom}{" "}
                <strong>{notReadyParticipants.map((p) => p.displayName).join(", ")}</strong>
                {" "}{t.lobbyCTA.readyCount(readyCount, participants.length)}
              </span>
            </InfoBanner>
          )}
          <button
            onClick={onStart}
            disabled={starting || !allReady}
            className={cn("flex items-center justify-center gap-2", PRIMARY_BUTTON_CLASS)}
          >
            {starting ? (
              <>
                <Spinner size="sm" />
                {t.lobbyCTA.starting}
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                {t.lobbyCTA.startTournament}
              </>
            )}
          </button>
          {allReady && participants.length >= 2 && (
            <p className="text-center text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              {t.lobbyCTA.allReady}
            </p>
          )}
        </>
      )}

      {!isCreator && (
        <InfoBanner variant="info" className="justify-center py-4">
          <PulseDot color="amber" size="md" />
          {t.lobbyCTA.waitingCreator}
        </InfoBanner>
      )}
    </div>
  );
}
