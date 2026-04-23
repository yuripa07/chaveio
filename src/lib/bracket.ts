/**
 * Given a 1-indexed matchNumber in a round (of the NEXT round), returns the
 * two matchNumbers from the PREVIOUS round that feed into it.
 * Inverse of getNextRoundSlot.
 */
export function getFeederMatches(matchNumber: number): [number, number] {
  return [2 * matchNumber - 1, 2 * matchNumber];
}

/**
 * Given a 1-indexed matchNumber in a round, returns where the winner goes
 * in the next round.
 */
export function getNextRoundSlot(matchNumber: number): {
  matchIndex: number;
  slotPosition: 1 | 2;
} {
  return {
    matchIndex: Math.floor((matchNumber - 1) / 2),
    slotPosition: matchNumber % 2 === 1 ? 1 : 2,
  };
}
