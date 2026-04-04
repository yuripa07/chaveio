import Link from "next/link";
import { cn } from "@/lib/cn";
import { PRIMARY_BUTTON_CLASS } from "@/constants/styles";
import { InfoBanner } from "@/components/info-banner";
import { PulseDot } from "@/components/pulse-dot";
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

  return (
    <div className="space-y-3">
      <Link
        href={`/tournament/${code}/bracket`}
        className={cn(
          "flex items-center justify-center gap-2",
          PRIMARY_BUTTON_CLASS
        )}
      >
        Fazer palpites →
      </Link>

      {isCreator && (
        <>
          {!allReady && (
            <InfoBanner variant="warning">
              Aguardando palpites de:{" "}
              {notReadyParticipants.map((participant) => participant.displayName).join(", ")}
            </InfoBanner>
          )}
          <button
            onClick={onStart}
            disabled={starting || !allReady}
            className={PRIMARY_BUTTON_CLASS}
          >
            {starting ? "Iniciando…" : "Iniciar torneio"}
          </button>
        </>
      )}

      {!isCreator && (
        <InfoBanner variant="info" className="justify-center py-4">
          <PulseDot color="amber" size="md" />
          Aguardando o criador iniciar…
        </InfoBanner>
      )}
    </div>
  );
}
