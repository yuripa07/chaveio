/**
 * Computes the point value for a round.
 * Rounds 1...(totalRounds-1): 2^(roundNumber-1)
 * Final round: N (item count) — intentionally breaks geometric progression
 */
export function computeRoundPoints(
  roundNumber: number,
  totalRounds: number,
  itemCount: number
): number {
  if (roundNumber === totalRounds) return itemCount;
  return Math.pow(2, roundNumber - 1);
}

/**
 * Maximum points a perfect bracket can score for N items.
 * Sum of all round point values across (N/2) matches per round.
 */
export function computeMaxPoints(itemCount: number): number {
  const totalRounds = Math.log2(itemCount);
  let total = 0;
  for (let r = 1; r <= totalRounds; r++) {
    const matchesInRound = itemCount / Math.pow(2, r);
    total += computeRoundPoints(r, totalRounds, itemCount) * matchesInRound;
  }
  return total;
}
