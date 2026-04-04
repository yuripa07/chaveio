import { getFeederMatches, getNextRoundSlot } from "@/lib/bracket";
import type { BracketRound, MatchSlot } from "@/types/tournament";

/**
 * Fills in virtual slots for rounds after startRound based on the
 * participant's own picks. This lets the bracket UI show predicted
 * matchups even before matches are actually created server-side.
 */
export function augmentRounds(
  rounds: BracketRound[],
  picks: Record<string, string>,
  startRound: number
): BracketRound[] {
  const roundByNumber = new Map(rounds.map((round) => [round.roundNumber, round]));

  return rounds.map((round) => {
    if (round.roundNumber <= startRound) return round;

    const previousRound = roundByNumber.get(round.roundNumber - 1)!;
    const augmentedMatches = round.matches.map((match) => {
      if (match.slots.length >= 2) return match;
      const [feeder1Num, feeder2Num] = getFeederMatches(match.matchNumber);
      const feeder1 = previousRound.matches.find((m) => m.matchNumber === feeder1Num);
      const feeder2 = previousRound.matches.find((m) => m.matchNumber === feeder2Num);
      const pick1 = feeder1 ? picks[feeder1.id] : null;
      const pick2 = feeder2 ? picks[feeder2.id] : null;
      const virtualSlots: MatchSlot[] = [];
      if (pick1) virtualSlots.push({ id: `v-${match.id}-1`, itemId: pick1, position: 1 });
      if (pick2) virtualSlots.push({ id: `v-${match.id}-2`, itemId: pick2, position: 2 });
      return { ...match, slots: virtualSlots };
    });

    return { ...round, matches: augmentedMatches };
  });
}

/**
 * When a pick changes, clears any downstream picks that depended on
 * the old selection. Maintains bracket consistency.
 */
export function clearDownstream(
  changedMatchId: string,
  rounds: BracketRound[],
  picks: Record<string, string>
): Record<string, string> {
  const updated = { ...picks };

  let roundNumber = -1;
  let matchNumber = -1;
  for (const round of rounds) {
    for (const match of round.matches) {
      if (match.id === changedMatchId) {
        roundNumber = round.roundNumber;
        matchNumber = match.matchNumber;
        break;
      }
    }
  }
  if (roundNumber === -1) return updated;

  const previousPickedItem = picks[changedMatchId];

  function cascade(currentRound: number, currentMatch: number, oldItem: string | undefined) {
    const { matchIndex } = getNextRoundSlot(currentMatch);
    const nextMatchNumber = matchIndex + 1;
    const nextRound = rounds.find((r) => r.roundNumber === currentRound + 1);
    if (!nextRound) return;
    const nextMatch = nextRound.matches.find((m) => m.matchNumber === nextMatchNumber);
    if (!nextMatch) return;
    const currentPick = updated[nextMatch.id];
    if (currentPick && currentPick === oldItem) {
      delete updated[nextMatch.id];
      cascade(currentRound + 1, nextMatchNumber, currentPick);
    }
  }

  cascade(roundNumber, matchNumber, previousPickedItem);
  return updated;
}
