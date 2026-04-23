export type TournamentItem = { id: string; name: string; seed: number };

export type MatchSlot = { id: string; itemId: string; position: number };

export type BracketMatch = {
  id: string;
  matchNumber: number;
  status: string;
  winnerId: string | null;
  slots: MatchSlot[];
};

export type BracketRound = {
  id: string;
  roundNumber: number;
  name?: string | null;
  status: string;
  pointValue: number;
  matches: BracketMatch[];
};

export type Participant = {
  id: string;
  displayName: string;
  isCreator: boolean;
  hasSubmittedPicks: boolean;
  joinedAtRound?: number | null;
  userId?: string | null;
};

export type PickResult = {
  matchId: string;
  pickedItemId: string;
  isCorrect: boolean | null;
  pointsEarned: number;
};

export type RankEntry = {
  participantId: string;
  displayName: string;
  totalPoints: number;
  rank: number;
};

export type TournamentCore = {
  id: string;
  code: string;
  name: string;
  status: string;
  theme?: string;
  authMode?: string;
};

export type TournamentState = {
  tournament: TournamentCore;
  participants: Participant[];
  items: TournamentItem[];
  rounds: BracketRound[];
};

export type ItemMap = Record<string, TournamentItem>;
