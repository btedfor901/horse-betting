// Normalized data shapes returned by every provider.
// Providers transform their raw source data into these types
// before the API routes persist them.

export interface NormalizedHorse {
  programNumber?: string;
  postPosition: number;
  horseName: string;
  morningLineOdds?: string;
  currentOdds?: string;
  jockeyName?: string;
  jockeyWinPct?: number;
  trainerName?: string;
  trainerWinPct?: number;
  owner?: string;
  weight?: number;
  medication?: string;
  equipment?: string;
  runStyle?: string;
  daysOff?: number;
  avgSpeed?: number;
  bestSpeed?: number;
  backSpeed?: number;
  speedLR?: number;
  primePower?: number;
  avgClass?: number;
  lastClass?: number;
  earlyPace1?: number;
  earlyPace2?: number;
  latePace?: number;
  avgDistance?: number;
  angles?: string;
  scratched?: boolean;
}

export interface NormalizedRace {
  number: number;
  postTime?: string;
  distance: string;
  surface: string;
  raceType: string;
  purse?: string;
  conditions?: string;
  horses: NormalizedHorse[];
}

export interface NormalizedRacecard {
  track: string;
  date: string;
  source: string;
  races: NormalizedRace[];
}

export interface NormalizedResult {
  raceNumber: number;
  winner: string;
  orderOfFinish: string[];
  winPayout?: number;
  placePayout?: number;
  showPayout?: number;
  exactaPayout?: number;
  trifectaPayout?: number;
  superfectaPayout?: number;
  scratches?: string[];
}

export interface ImportResult {
  success: boolean;
  source: string;
  racecard?: NormalizedRacecard;
  results?: NormalizedResult[];
  error?: string;
  rawData?: unknown;
}

export interface DataProvider {
  name: string;
  fetchRacecard(track: string, date: string): Promise<ImportResult>;
  fetchResults(track: string, date: string): Promise<ImportResult>;
}
