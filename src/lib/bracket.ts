/**
 * Returns seed positions for a single-elimination bracket of size n.
 * Uses recursive "standard seeding" so 1 vs n, 2 vs (n-1), etc. within regions.
 *
 * For n=4:  [1, 4, 3, 2]  → matches: 1v4, 3v2
 * For n=8:  [1, 8, 5, 4, 3, 6, 7, 2]
 */
export function seedPositions(n: number): number[] {
  if (n === 2) return [1, 2];
  const upper = seedPositions(n / 2);
  return upper.flatMap((seed, i) => {
    const complement = n + 1 - seed;
    return i % 2 === 0 ? [seed, complement] : [complement, seed];
  });
}

/**
 * Generates first-round match pairs from seed positions.
 * Returns array of [seed1, seed2] pairs.
 */
export function generateFirstRoundPairs(n: number): [number, number][] {
  const positions = seedPositions(n);
  const pairs: [number, number][] = [];
  for (let i = 0; i < positions.length; i += 2) {
    pairs.push([positions[i], positions[i + 1]]);
  }
  return pairs;
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
