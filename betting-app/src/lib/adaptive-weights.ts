/**
 * Phase 2 — Adaptive Scoring Weights
 *
 * NOT YET ACTIVE. Wire this up once 50+ races are recorded at one track.
 * To activate: import { getAdaptiveWeights } from '@/lib/adaptive-weights'
 * and pass the weights into scoreHorse() instead of hardcoded constants.
 *
 * How it works:
 *   1. Pull all completed races with scores + results from the DB
 *   2. For each race, find the winner's subscore vs field average
 *   3. Calculate "winner premium" per component (how much more winners score)
 *   4. Redistribute the 100-point total proportional to predictive power
 *   5. Apply a damping factor so weights shift gradually, not all at once
 */

export interface ScoringWeights {
  // Speed (was 25)
  bestSpeed: number;
  backSpeed: number;
  // Class (was 20)
  primePower: number;
  avgClass: number;
  // Form (was 15)
  speedLR: number;
  daysOff: number;
  // Pace (was 10)
  latePace: number;
  paceSetup: number;
  // Single-value components
  jockey: number;   // was 10
  trainer: number;  // was 10
  post: number;     // was 5
  value: number;    // was 5
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  bestSpeed: 15, backSpeed: 10,
  primePower: 12, avgClass: 8,
  speedLR: 10, daysOff: 5,
  latePace: 6, paceSetup: 4,
  jockey: 10, trainer: 10,
  post: 5, value: 5,
};

interface RaceDataPoint {
  winnerPremiums: {
    speed: number;   // winner speedScore - field avg speedScore
    class: number;
    form: number;
    pace: number;
    jockey: number;
    trainer: number;
    post: number;
    value: number;
  };
}

/**
 * Compute suggested weights from historical race data.
 * Call this when totalRaces >= 50 to get data-driven weights.
 *
 * @param dataPoints  - array of per-race winner premium data
 * @param dampingFactor - 0–1, how aggressively to move from defaults (0.3 = gentle)
 * @returns adjusted ScoringWeights that still sum to 100
 */
export function computeAdaptiveWeights(
  dataPoints: RaceDataPoint[],
  dampingFactor = 0.3,
): ScoringWeights {
  if (dataPoints.length < 20) return DEFAULT_WEIGHTS;

  // Average winner premium per component
  const avg = (fn: (d: RaceDataPoint) => number) =>
    dataPoints.reduce((s, d) => s + fn(d), 0) / dataPoints.length;

  const premiums = {
    speed:   Math.max(0, avg(d => d.winnerPremiums.speed)),
    class:   Math.max(0, avg(d => d.winnerPremiums.class)),
    form:    Math.max(0, avg(d => d.winnerPremiums.form)),
    pace:    Math.max(0, avg(d => d.winnerPremiums.pace)),
    jockey:  Math.max(0, avg(d => d.winnerPremiums.jockey)),
    trainer: Math.max(0, avg(d => d.winnerPremiums.trainer)),
    post:    Math.max(0, avg(d => d.winnerPremiums.post)),
    value:   Math.max(0, avg(d => d.winnerPremiums.value)),
  };

  // Default group weights (speed=25, class=20, form=15, pace=10, jockey=10, trainer=10, post=5, value=5)
  const defaults = { speed: 25, class: 20, form: 15, pace: 10, jockey: 10, trainer: 10, post: 5, value: 5 };
  const totalDefault = 100;

  // Normalize premiums to same scale as default weights
  const premiumTotal = Object.values(premiums).reduce((s, v) => s + v, 0) || 1;
  const premiumWeights = Object.fromEntries(
    Object.entries(premiums).map(([k, v]) => [k, (v / premiumTotal) * totalDefault])
  );

  // Blend: new = default * (1 - damping) + premium * damping
  const blended = Object.fromEntries(
    Object.keys(defaults).map(k => [
      k,
      (defaults[k as keyof typeof defaults] * (1 - dampingFactor)) +
      (premiumWeights[k] * dampingFactor),
    ])
  ) as typeof defaults;

  // Re-normalize to exactly 100
  const blendedTotal = Object.values(blended).reduce((s, v) => s + v, 0);
  const scale = totalDefault / blendedTotal;

  // Distribute within speed (60/40 split), class (60/40), form (67/33), pace (60/40)
  return {
    bestSpeed:  Math.round(blended.speed * 0.60 * scale * 10) / 10,
    backSpeed:  Math.round(blended.speed * 0.40 * scale * 10) / 10,
    primePower: Math.round(blended.class * 0.60 * scale * 10) / 10,
    avgClass:   Math.round(blended.class * 0.40 * scale * 10) / 10,
    speedLR:    Math.round(blended.form  * 0.67 * scale * 10) / 10,
    daysOff:    Math.round(blended.form  * 0.33 * scale * 10) / 10,
    latePace:   Math.round(blended.pace  * 0.60 * scale * 10) / 10,
    paceSetup:  Math.round(blended.pace  * 0.40 * scale * 10) / 10,
    jockey:     Math.round(blended.jockey  * scale * 10) / 10,
    trainer:    Math.round(blended.trainer * scale * 10) / 10,
    post:       Math.round(blended.post    * scale * 10) / 10,
    value:      Math.round(blended.value   * scale * 10) / 10,
  };
}

/**
 * Human-readable weight change summary for display in the UI.
 * Shows what changed from defaults and by how much.
 */
export function describeWeightChanges(weights: ScoringWeights): string[] {
  const changes: string[] = [];
  const groups = [
    { label: 'Speed', current: weights.bestSpeed + weights.backSpeed, default: 25 },
    { label: 'Class', current: weights.primePower + weights.avgClass, default: 20 },
    { label: 'Form',  current: weights.speedLR + weights.daysOff, default: 15 },
    { label: 'Pace',  current: weights.latePace + weights.paceSetup, default: 10 },
    { label: 'Jockey',  current: weights.jockey,  default: 10 },
    { label: 'Trainer', current: weights.trainer, default: 10 },
    { label: 'Post',    current: weights.post,    default: 5  },
    { label: 'Value',   current: weights.value,   default: 5  },
  ];

  for (const g of groups) {
    const delta = Math.round((g.current - g.default) * 10) / 10;
    if (Math.abs(delta) >= 0.5) {
      changes.push(`${g.label}: ${g.default} → ${g.current.toFixed(1)} (${delta > 0 ? '+' : ''}${delta})`);
    }
  }

  return changes.length > 0 ? changes : ['No significant weight changes yet.'];
}
