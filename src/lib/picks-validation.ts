import { getFeederMatches } from "@/lib/bracket";

type Slot = { itemId: string; position: number };
type Match = { id: string; matchNumber: number; status: string; slots: Slot[] };
type Round = { roundNumber: number; matches: Match[] };

type Pick = { matchId: string; pickedItemId: string };

type ValidationResult = { valid: true } | { valid: false; error: string };

/**
 * Validates a full bracket prediction submission.
 *
 * Rules:
 * - For pre-start participants (joinedAtRound = null): must pick every match in all rounds.
 * - For late joiners (joinedAtRound = N): must pick every match from round N onward.
 * - Start round picks: pickedItemId must be one of the match's actual slot items.
 * - Subsequent rounds: pickedItemId must equal the participant's pick from one of the
 *   two feeder matches (getFeederMatches gives the pair).
 * - Exactly one pick per required match.
 */
export function validateBracketPicks(params: {
  picks: Pick[];
  rounds: Round[];
  joinedAtRound: number | null;
}): ValidationResult {
  const { picks, rounds, joinedAtRound } = params;

  const startRound = joinedAtRound ?? 1;
  const pickMap = new Map<string, string>(); // matchId → pickedItemId
  for (const p of picks) {
    pickMap.set(p.matchId, p.pickedItemId);
  }

  // Build lookup structures
  const matchById = new Map<string, Match & { roundNumber: number }>();
  const matchByRoundAndNumber = new Map<string, Match>();

  for (const round of rounds) {
    for (const match of round.matches) {
      matchById.set(match.id, { ...match, roundNumber: round.roundNumber });
      matchByRoundAndNumber.set(`${round.roundNumber}:${match.matchNumber}`, match);
    }
  }

  // Required matches: all matches from startRound onward
  const requiredMatches = rounds
    .filter((r) => r.roundNumber >= startRound)
    .flatMap((r) => r.matches.map((m) => ({ ...m, roundNumber: r.roundNumber })));

  // Check coverage
  for (const match of requiredMatches) {
    if (!pickMap.has(match.id)) {
      return {
        valid: false,
        error: `Missing pick for match ${match.id} (round ${match.roundNumber}, match ${match.matchNumber})`,
      };
    }
  }

  // Validate each required pick
  for (const match of requiredMatches) {
    const pickedItemId = pickMap.get(match.id)!;

    if (match.roundNumber === startRound) {
      // Start round: item must be in actual match slots
      const slotItems = match.slots.map((s) => s.itemId);
      if (!slotItems.includes(pickedItemId)) {
        return {
          valid: false,
          error: `Invalid pick for match ${match.id}: item "${pickedItemId}" not in match slots`,
        };
      }
    } else {
      // Later round: item must cascade from one of the two feeder matches
      const [feeder1Num, feeder2Num] = getFeederMatches(match.matchNumber);
      const prevRoundNumber = match.roundNumber - 1;

      const feeder1 = matchByRoundAndNumber.get(`${prevRoundNumber}:${feeder1Num}`);
      const feeder2 = matchByRoundAndNumber.get(`${prevRoundNumber}:${feeder2Num}`);

      if (!feeder1 || !feeder2) {
        return { valid: false, error: `Could not find feeder matches for match ${match.id}` };
      }

      // For start-round feeders: get the actual pick; for pre-start feeders: look up in pickMap
      const pick1 = pickMap.get(feeder1.id);
      const pick2 = pickMap.get(feeder2.id);

      // Feeder picks may come from actual match slots (for rounds before the start round)
      const validPredecessors = new Set<string>();
      if (pick1) validPredecessors.add(pick1);
      if (pick2) validPredecessors.add(pick2);

      // For late joiners: feeder matches from before joinedAtRound use actual slots
      if (match.roundNumber - 1 < startRound) {
        feeder1.slots.forEach((s) => validPredecessors.add(s.itemId));
        feeder2.slots.forEach((s) => validPredecessors.add(s.itemId));
      }

      if (!validPredecessors.has(pickedItemId)) {
        return {
          valid: false,
          error: `Cascade violation for match ${match.id} (round ${match.roundNumber}): item "${pickedItemId}" did not advance from feeder matches`,
        };
      }
    }
  }

  return { valid: true };
}
