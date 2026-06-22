export type Surface = 'dirt' | 'turf' | 'synthetic';
export type RaceType =
  | 'maiden'
  | 'maiden-special-weight'
  | 'claiming'
  | 'optional-claiming'
  | 'allowance'
  | 'stakes'
  | 'handicap';
export type RunStyle = 'E' | 'P' | 'S' | 'C' | '';
export type BetType = 'no-bet' | 'win' | 'place' | 'show' | 'exacta-box' | 'trifecta-box';
export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'none';

export interface Horse {
  id: string;
  name: string;
  postPosition: number;
  morningLineOdds: string;
  currentOdds: string;
  jockeyName: string;
  jockeyWinPct: number | null;
  trainerName: string;
  trainerWinPct: number | null;
  runStyle: RunStyle;
  daysOff: number | null;
  avgSpeed: number | null;
  bestSpeed: number | null;
  backSpeed: number | null;
  speedLR: number | null;
  primePower: number | null;
  avgClass: number | null;
  lastClass: number | null;
  earlyPace1: number | null;
  earlyPace2: number | null;
  latePace: number | null;
  avgDistance: number | null;
  angles: string;
  scratched: boolean;
  hotJockey?: boolean;
}

export interface HorseScore {
  horseId: string;
  horseName: string;
  speedScore: number;
  classScore: number;
  formScore: number;
  paceScore: number;
  jockeyScore: number;
  trainerScore: number;
  postScore: number;
  valueScore: number;
  totalScore: number;
  rank: number;
  confidence: ConfidenceLevel;
  valueRating: number;
  modelProbability: number;
  impliedProbability: number;
}

export interface BetRecommendation {
  betType: BetType;
  amount: number;
  costPerCombination: number;
  totalCost: number;
  horses: string[];
  horseIds: string[];
  confidence: ConfidenceLevel;
  reasoning: string;
  scoreLead: number;
}

export interface RaceResult {
  winner: string;
  orderOfFinish: string[];
  betType: BetType;
  amountWagered: number;
  amountReturned: number;
  profitLoss: number;
  notes: string;
}

export interface Race {
  id: string;
  raceDayId: string;
  number: number;
  postTime: string;
  distance: string;
  surface: Surface;
  raceType: RaceType;
  purse: string;
  conditions: string;
  horses: Horse[];
  scores: HorseScore[];
  recommendation: BetRecommendation | null;
  result: RaceResult | null;
  createdAt: string;
}

export interface RaceDay {
  id: string;
  date: string;
  track: string;
  races: Race[];
  createdAt: string;
}

export interface BankrollSettings {
  startingBankroll: number;
  currentBankroll: number;
  unitSize: number;
  maxBetPerRace: number;
  dailyStopLoss: number;
  dailyProfitTarget: number;
  maxBetsPerDay: number;
}
