import Link from "next/link";
import { cn } from "@/lib/cn";
import { ClipboardList, Play, Clock } from "lucide-react";
import { PRIMARY_BUTTON_CLASS } from "@/constants/styles";
import { InfoBanner } from "@/components/info-banner";
import { PulseDot } from "@/components/pulse-dot";
import { Spinner } from "@/components/spinner";
import type { Participant } from "@/types/tournament";

type LobbyCTAProps = {
  code: string;
  participants: Participant[];
  isCreator: boolean;
  starting: boolean;
  onStart: () => void;
};

export function LobbyCTA({ code, participants, isCreator, starting, onStart }: LobbyCTAProps) {
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
        Fazer palpites
      </Link>

      {isCreator && (
        <>
          {!allReady && (
            <InfoBanner variant="warning">
              <Clock className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Aguardando palpites de:{" "}
                <strong>{notReadyParticipants.map((p) => p.displayName).join(", ")}</strong>
                {" "}· {readyCount} de {participants.length} prontos.
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
                Iniciando torneio…
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Iniciar torneio
              </>
            )}
          </button>
          {allReady && participants.length >= 2 && (
            <p className="text-center text-xs text-emerald-600 font-medium">
              Todos os participantes enviaram seus palpites. Pronto para iniciar!
            </p>
          )}
        </>
      )}

      {!isCreator && (
        <InfoBanner variant="info" className="justify-center py-4">
          <PulseDot color="amber" size="md" />
          Aguardando o criador iniciar o torneio…
        </InfoBanner>
      )}
    </div>
  );
}
