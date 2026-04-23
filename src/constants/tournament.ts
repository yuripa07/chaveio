export const TournamentStatus = {
  LOBBY: "LOBBY",
  ACTIVE: "ACTIVE",
  FINISHED: "FINISHED",
} as const;

export type TournamentStatusValue = (typeof TournamentStatus)[keyof typeof TournamentStatus];

export const RoundStatus = {
  PENDING: "PENDING",
  ACTIVE: "ACTIVE",
  COMPLETE: "COMPLETE",
} as const;

export const MatchStatus = {
  PENDING: "PENDING",
  COMPLETE: "COMPLETE",
} as const;

export const VALID_TOURNAMENT_SIZES = [4, 8, 16, 32] as const;
export const MAX_TOURNAMENT_SIZE = 32;
export const TOURNAMENT_CODE_LENGTH = 6;

export const POLL_INTERVAL_LOBBY = 3000;
export const POLL_INTERVAL_BRACKET = 5000;
export const POLL_INTERVAL_RESULTS = 4000;
export const POLL_INTERVAL_LIVE = 4000;
