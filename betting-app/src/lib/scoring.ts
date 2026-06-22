import { Horse, HorseScore, BetRecommendation, BankrollSettings, ConfidenceLevel } from './types';

// ── Odds helpers ──────────────────────────────────────────────────────────────

export function parseOdds(odds: string): number | null {
  if (!odds || odds === '-' || odds === '') return null;
  if (odds.includes('/')) {
    const [n, d] = odds.split('/').map(Number);
    if (!d || d === 0) return null;
    return n / d;
  }
  const n = parseFloat(odds);
  return isNaN(n) ? null : n;
}

export function oddsToImpliedProb(odds: string): number {
  const dec = parseOdds(odds);
  if (dec === null) return 0;
  return 1 / (dec + 1);
}

export function formatOdds(odds: string): string {
  if (!odds) return '-';
  return odds;
}

// ── Field helpers ─────────────────────────────────────────────────────────────

function activeHorses(horses: Horse[]): Horse[] {
  return horses.filter(h => !h.scratched);
}

function fieldMax(active: Horse[], fn: (h: Horse) => number | null): number {
  const vals = active.map(fn).filter((v): v is number => v !== null && v > 0);
  return vals.length > 0 ? Math.max(...vals) : 1;
}

function safeVal(v: number | null | undefined): number | null {
  if (v === null || v === undefined || v === 0) return null;
  return v;
}

// Normalize: if value is null → neutral (45% of weight). Else proportional to field max.
function norm(value: number | null, max: number, weight: number): number {
  if (value === null || value === 0 || max <= 0) return weight * 0.45;
  return Math.min(weight, (value / max) * weight);
}

// ── Individual horse scorer ───────────────────────────────────────────────────

export function scoreHorse(
  horse: Horse,
  allHorses: Horse[],
  distance: string,
): HorseScore {
  const active = activeHorses(allHorses);

  // ── SPEED (0–25) ──────────────────────────────────────────────────────────
  const maxBest = fieldMax(active, h => safeVal(h.bestSpeed));
  const maxBack = fieldMax(active, h => safeVal(h.backSpeed));
  const speedScore = Math.min(
    25,
    norm(safeVal(horse.bestSpeed), maxBest, 15) +
    norm(safeVal(horse.backSpeed), maxBack, 10),
  );

  // ── CLASS (0–20) ──────────────────────────────────────────────────────────
  const maxPP = fieldMax(active, h => safeVal(h.primePower));
  const maxAC = fieldMax(active, h => safeVal(h.avgClass));
  const classScore = Math.min(
    20,
    norm(safeVal(horse.primePower), maxPP, 12) +
    norm(safeVal(horse.avgClass), maxAC, 8),
  );

  // ── FORM / RECENCY (0–15) ─────────────────────────────────────────────────
  const maxSLR = fieldMax(active, h => safeVal(h.speedLR));
  const formSLR = norm(safeVal(horse.speedLR), maxSLR, 10);
  let formDays = 3;
  if (horse.daysOff !== null) {
    if (horse.daysOff >= 14 && horse.daysOff <= 30) formDays = 5;
    else if (horse.daysOff >= 31 && horse.daysOff <= 45) formDays = 4;
    else if (horse.daysOff >= 7 && horse.daysOff <= 13) formDays = 2;
    else if (horse.daysOff > 45 && horse.daysOff <= 65) formDays = 2;
    else if (horse.daysOff > 65) formDays = 1;
  }
  const formScore = Math.min(15, formSLR + formDays);

  // ── PACE FIT (0–10) ───────────────────────────────────────────────────────
  const maxLP = fieldMax(active, h => safeVal(h.latePace));
  const paceLP = norm(safeVal(horse.latePace), maxLP, 6);
  const earlyCount = active.filter(h => h.runStyle === 'E').length;

  let paceSetup = 2;
  if (horse.runStyle === 'S' || horse.runStyle === 'C') {
    if (earlyCount >= 3) paceSetup = 4;
    else if (earlyCount >= 2) paceSetup = 3;
    else paceSetup = 2;
  } else if (horse.runStyle === 'E') {
    if (earlyCount >= 3) paceSetup = 1;
    else if (earlyCount === 1) paceSetup = 4;
    else paceSetup = 2;
  } else if (horse.runStyle === 'P') {
    paceSetup = 3;
  }
  const paceScore = Math.min(10, paceLP + paceSetup);

  // ── JOCKEY (0–10) ─────────────────────────────────────────────────────────
  let jockeyScore = 5;
  if (horse.jockeyWinPct !== null) {
    if (horse.jockeyWinPct >= 25) jockeyScore = 10;
    else if (horse.jockeyWinPct >= 20) jockeyScore = 8;
    else if (horse.jockeyWinPct >= 15) jockeyScore = 7;
    else if (horse.jockeyWinPct >= 10) jockeyScore = 5;
    else if (horse.jockeyWinPct >= 7) jockeyScore = 3;
    else jockeyScore = 2;
  }

  // ── TRAINER (0–10) ────────────────────────────────────────────────────────
  let trainerScore = 5;
  if (horse.trainerWinPct !== null) {
    if (horse.trainerWinPct >= 20) trainerScore = 10;
    else if (horse.trainerWinPct >= 16) trainerScore = 8;
    else if (horse.trainerWinPct >= 12) trainerScore = 6;
    else if (horse.trainerWinPct >= 8) trainerScore = 4;
    else trainerScore = 2;
  }

  // ── POST POSITION (0–5) ───────────────────────────────────────────────────
  const pp = horse.postPosition;
  const isSprint =
    distance.toLowerCase().includes('f') &&
    parseFloat(distance) < 8;
  let postScore = 3;
  if (isSprint) {
    if (pp <= 3) postScore = 5;
    else if (pp <= 6) postScore = 3;
    else postScore = 2;
  } else {
    // Route at Churchill: mid-inside posts best
    if (pp >= 2 && pp <= 5) postScore = 5;
    else if (pp === 1 || (pp >= 6 && pp <= 8)) postScore = 3;
    else postScore = 2;
  }

  // ── VALUE (0–5) ───────────────────────────────────────────────────────────
  const mlDec = parseOdds(horse.morningLineOdds);
  const curDec = parseOdds(horse.currentOdds || horse.morningLineOdds);
  let valueScore = 2.5;
  if (mlDec !== null && curDec !== null && mlDec > 0) {
    const ratio = curDec / mlDec;
    if (ratio < 0.75) valueScore = 5;      // money coming in hard
    else if (ratio < 0.90) valueScore = 4;
    else if (ratio <= 1.10) valueScore = 3; // holding
    else if (ratio <= 1.35) valueScore = 2;
    else valueScore = 1;                    // public bailing
  }

  // ── ANGLE BONUS (0–3 extra pts) ───────────────────────────────────────────
  const anglesLower = horse.angles.toLowerCase();
  let angleBonus = 0;
  if (anglesLower.includes('horse for course')) angleBonus += 1.5;
  if (anglesLower.includes('clocker special')) angleBonus += 1.5;
  if (anglesLower.includes('key trainer')) angleBonus += 1;
  if (anglesLower.includes('best distance')) angleBonus += 1;
  if (anglesLower.includes('hot jockey')) angleBonus += 0.5;

  const rawTotal =
    speedScore + classScore + formScore + paceScore +
    jockeyScore + trainerScore + postScore + valueScore + angleBonus;

  const totalScore = Math.min(100, Math.round(rawTotal * 10) / 10);

  let confidence: ConfidenceLevel = 'none';
  if (totalScore >= 75) confidence = 'high';
  else if (totalScore >= 60) confidence = 'medium';
  else if (totalScore >= 44) confidence = 'low';

  return {
    horseId: horse.id,
    horseName: horse.name,
    speedScore: Math.round(speedScore * 10) / 10,
    classScore: Math.round(classScore * 10) / 10,
    formScore: Math.round(formScore * 10) / 10,
    paceScore: Math.round(paceScore * 10) / 10,
    jockeyScore,
    trainerScore,
    postScore,
    valueScore: Math.round(valueScore * 10) / 10,
    totalScore,
    rank: 0,
    confidence,
    valueRating: 0,
    modelProbability: 0,
    impliedProbability: 0,
  };
}

// ── Score entire field ────────────────────────────────────────────────────────

export function scoreField(horses: Horse[], distance: string): HorseScore[] {
  const scores = horses.map(h => scoreHorse(h, horses, distance));

  // Model probabilities from score totals (active only)
  const activeScoreSum = scores
    .filter(s => !horses.find(h => h.id === s.horseId)?.scratched)
    .reduce((sum, s) => sum + Math.max(s.totalScore, 1), 0);

  scores.forEach(score => {
    const horse = horses.find(h => h.id === score.horseId);
    if (horse?.scratched) {
      score.modelProbability = 0;
      score.valueRating = 0;
      return;
    }
    score.modelProbability = Math.max(score.totalScore, 1) / activeScoreSum;
    score.impliedProbability = oddsToImpliedProb(
      horse?.currentOdds || horse?.morningLineOdds || '99'
    );
    score.valueRating = score.modelProbability - score.impliedProbability;
  });

  // Rank by total score (active only)
  const activeScores = scores.filter(
    s => !horses.find(h => h.id === s.horseId)?.scratched
  );
  const sorted = [...activeScores].sort((a, b) => b.totalScore - a.totalScore);
  sorted.forEach((s, i) => { s.rank = i + 1; });

  // Scratched horses rank last
  scores
    .filter(s => horses.find(h => h.id === s.horseId)?.scratched)
    .forEach(s => { s.rank = 99; });

  return scores;
}

// ── Bet recommendation ────────────────────────────────────────────────────────
//
// Rules:
//   Win Bet      — #1 score ≥ 10% higher than #2
//   Exacta Box   — #1 & #2 both ≥ 10% above #3
//   Trifecta Box — #1, #2 & #3 all ≥ 10% above #4
//   No Bet       — none of the above

export function getRecommendation(
  horses: Horse[],
  scores: HorseScore[],
  settings: BankrollSettings,
): BetRecommendation {
  const nobet = (reason: string): BetRecommendation => ({
    betType: 'no-bet',
    amount: 0,
    costPerCombination: 0,
    totalCost: 0,
    horses: [],
    horseIds: [],
    confidence: 'none',
    reasoning: reason,
    scoreLead: 0,
  });

  const active = scores
    .filter(s => !horses.find(h => h.id === s.horseId)?.scratched)
    .sort((a, b) => b.totalScore - a.totalScore);

  if (active.length < 2) return nobet('Not enough active horses to evaluate.');

  const [first, second, third, fourth] = active;
  const unit = settings.unitSize;

  // ── Win Bet: #1 is ≥ 10% higher than #2 ─────────────────────────────────
  const winThreshold = second.totalScore * 1.10;
  if (first.totalScore >= winThreshold) {
    const lead = ((first.totalScore - second.totalScore) / second.totalScore * 100).toFixed(1);
    const betAmount = first.confidence === 'high' ? unit * 2 :
                      first.confidence === 'medium' ? unit * 1 : unit * 0.5;
    return {
      betType: 'win',
      amount: betAmount,
      costPerCombination: betAmount,
      totalCost: betAmount,
      horses: [first.horseName],
      horseIds: [first.horseId],
      confidence: first.confidence,
      reasoning: `${first.horseName} leads the field by ${lead}% (${first.totalScore} vs ${second.totalScore}). Clear single best horse — WIN bet.`,
      scoreLead: first.totalScore - second.totalScore,
    };
  }

  // ── Exacta Box: top 2 both ≥ 10% above #3 ───────────────────────────────
  if (active.length >= 3) {
    const exactaThreshold = third ? third.totalScore * 1.10 : 0;
    if (
      first.totalScore >= exactaThreshold &&
      second.totalScore >= exactaThreshold
    ) {
      // $2 exacta box = 2 combinations × $2 = $4
      const costPerCombo = 2;
      const totalCost = 4;
      return {
        betType: 'exacta-box',
        amount: totalCost,
        costPerCombination: costPerCombo,
        totalCost,
        horses: [first.horseName, second.horseName],
        horseIds: [first.horseId, second.horseId],
        confidence: first.confidence === 'high' && second.confidence !== 'none' ? 'high' : 'medium',
        reasoning: `${first.horseName} (${first.totalScore}) and ${second.horseName} (${second.totalScore}) both score ≥10% above ${third.horseName} (${third.totalScore}). EXACTA BOX — $${costPerCombo}/combo, $${totalCost} total.`,
        scoreLead: first.totalScore - third.totalScore,
      };
    }
  }

  // ── Trifecta Box: top 3 all ≥ 10% above #4 ──────────────────────────────
  if (active.length >= 4 && third && fourth) {
    const trifectaThreshold = fourth.totalScore * 1.10;
    if (
      first.totalScore >= trifectaThreshold &&
      second.totalScore >= trifectaThreshold &&
      third.totalScore >= trifectaThreshold
    ) {
      // $1 trifecta box 3 horses = 6 combinations × $1 = $6
      const costPerCombo = 1;
      const totalCost = 6;
      return {
        betType: 'trifecta-box',
        amount: totalCost,
        costPerCombination: costPerCombo,
        totalCost,
        horses: [first.horseName, second.horseName, third.horseName],
        horseIds: [first.horseId, second.horseId, third.horseId],
        confidence: 'medium',
        reasoning: `Top 3 — ${first.horseName} (${first.totalScore}), ${second.horseName} (${second.totalScore}), ${third.horseName} (${third.totalScore}) — all score ≥10% above ${fourth.horseName} (${fourth.totalScore}). TRIFECTA BOX — $${costPerCombo}/combo, $${totalCost} total.`,
        scoreLead: first.totalScore - fourth.totalScore,
      };
    }
  }

  // ── No Bet ───────────────────────────────────────────────────────────────
  const spread = first.totalScore - (active[active.length - 1]?.totalScore ?? 0);
  if (spread < 10) {
    return nobet(
      `Scores are tightly grouped (${first.totalScore} to ${active[active.length - 1]?.totalScore}). No clear separation — pass this race.`
    );
  }

  return nobet(
    `No separation meets the 10% threshold. Top score: ${first.totalScore} (${first.horseName}), #2: ${second.totalScore} (${second.horseName}). Insufficient edge — pass.`
  );
}
