'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/bankroll';
import { BetType } from '@/lib/types';

interface StatRow {
  label: string; bets: number; wins: number; wagered: number; returned: number; pnl: number;
}
function mkRow(label: string): StatRow {
  return { label, bets: 0, wins: 0, wagered: 0, returned: 0, pnl: 0 };
}

function PctBar({ val, max, color = 'bg-amber-500' }: { val: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, (val / max) * 100) : 0;
  return <div className="bg-slate-800 rounded-full h-1.5 w-full"><div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} /></div>;
}

function Table({ rows, title }: { rows: StatRow[]; title: string }) {
  if (rows.every(r => r.bets === 0)) return null;
  const maxBets = Math.max(...rows.map(r => r.bets));
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-slate-800"><h2 className="text-sm font-semibold text-white">{title}</h2></div>
      <div className="divide-y divide-slate-800">
        {rows.filter(r => r.bets > 0).map(r => {
          const roi = r.wagered > 0 ? r.pnl / r.wagered : 0;
          const winRate = r.bets > 0 ? r.wins / r.bets : 0;
          return (
            <div key={r.label} className="p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-white text-sm font-medium">{r.label}</span>
                <span className={`text-sm font-bold ${r.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {r.pnl >= 0 ? '+' : ''}{formatCurrency(r.pnl)}
                </span>
              </div>
              <PctBar val={r.bets} max={maxBets} />
              <div className="flex gap-4 mt-1.5 text-xs text-slate-500">
                <span>{r.bets} bets</span>
                <span>{(winRate * 100).toFixed(0)}% win</span>
                <span>ROI: <span className={roi >= 0 ? 'text-emerald-400' : 'text-red-400'}>{(roi * 100).toFixed(1)}%</span></span>
                <span className="ml-auto">{formatCurrency(r.wagered)} risked</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface Score {
  horseEntryId: string; totalScore: number;
  speedScore: number; classScore: number; formScore: number; paceScore: number;
  jockeyScore: number; trainerScore: number; postScore: number; valueScore: number;
}
interface Horse { id: string; horseName: string; scratched: boolean; }
interface Rec { betType: string; confidence: string; }
interface Result {
  betPlaced: string; amountWagered: number; amountReturned: number;
  profitLoss: number; orderOfFinish: string; winnerModelRank?: number;
}
interface Race {
  id: string; surface: string; raceType: string;
  horses: Horse[]; scores: Score[];
  recommendation?: Rec;
  result?: Result;
}
interface RaceDay { id: string; date: string; track: string; races: Race[]; }

const SCORE_COMPONENTS = [
  { key: 'speedScore',   label: 'Speed',   weight: 25 },
  { key: 'classScore',   label: 'Class',   weight: 20 },
  { key: 'formScore',    label: 'Form',    weight: 15 },
  { key: 'paceScore',    label: 'Pace',    weight: 10 },
  { key: 'jockeyScore',  label: 'Jockey',  weight: 10 },
  { key: 'trainerScore', label: 'Trainer', weight: 10 },
  { key: 'postScore',    label: 'Post',    weight: 5  },
  { key: 'valueScore',   label: 'Value',   weight: 5  },
] as const;

export default function AnalyticsPage() {
  const [days, setDays] = useState<RaceDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getRaceDays()
      .then(d => setDays(d as RaceDay[]))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const data = days.flatMap(d =>
    d.races.filter(r => r.result != null).map(r => ({ race: r, result: r.result!, track: d.track }))
  );

  if (loading) return <div className="text-slate-400 text-sm">Loading...</div>;

  if (data.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Analytics</h1>
        <p className="text-slate-400 text-sm mb-8">Track system performance over time.</p>
        <div className="text-center py-16 border border-dashed border-slate-800 rounded-xl">
          <div className="text-slate-500">No race results yet.</div>
          <div className="text-slate-600 text-sm mt-1">Enter results after each race to see analytics here.</div>
        </div>
      </div>
    );
  }

  // ── Core bet stats ──────────────────────────────────────────────────────────
  const betTypeRows: Record<BetType, StatRow> = {
    'no-bet': mkRow('No Bet (pass)'), 'win': mkRow('Win'), 'place': mkRow('Place'),
    'show': mkRow('Show'), 'exacta-box': mkRow('Exacta Box'), 'trifecta-box': mkRow('Trifecta Box'),
  };
  const surfaceRows: Record<string, StatRow> = {
    dirt: mkRow('Dirt'), turf: mkRow('Turf'), synthetic: mkRow('Synthetic'),
  };
  const raceTypeRows: Record<string, StatRow> = {};
  const confidenceRows: Record<string, StatRow> = {
    high: mkRow('High'), medium: mkRow('Medium'), low: mkRow('Low'), none: mkRow('None'),
  };
  const fieldBuckets: Record<string, StatRow> = {
    '2-5': mkRow('Small (2–5)'), '6-8': mkRow('Medium (6–8)'), '9+': mkRow('Large (9+)'),
  };
  const trackRows: Record<string, StatRow> = {};

  let totalBets = 0, totalWins = 0, totalWagered = 0, totalReturned = 0;
  let modelTopWins = 0, modelTopTotal = 0;

  // ── Rank distribution: how often did #1/#2/#3/4+ picks win? ───────────────
  const rankDist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  let rankTotal = 0;

  // ── Score component correlation ────────────────────────────────────────────
  // For each completed race with scores, find the winner's subscores vs field avg
  const componentSums: Record<string, { winnerTotal: number; fieldTotal: number; count: number }> = {};
  for (const c of SCORE_COMPONENTS) componentSums[c.key] = { winnerTotal: 0, fieldTotal: 0, count: 0 };

  for (const { race, result, track } of data) {
    if (result.betPlaced === 'no-bet') continue;

    type BetItem = { type: string; wagered: number; returned: number };
    let betItems: BetItem[];
    try {
      betItems = result.betPlaced.startsWith('[')
        ? (JSON.parse(result.betPlaced) as BetItem[])
        : [{ type: result.betPlaced, wagered: result.amountWagered, returned: result.amountReturned }];
    } catch { betItems = [{ type: result.betPlaced, wagered: result.amountWagered, returned: result.amountReturned }]; }

    for (const item of betItems.filter(b => b.type !== 'no-bet')) {
      const pnl = item.returned - item.wagered;
      const bet = betTypeRows[item.type as BetType];
      if (bet) { bet.bets++; bet.wagered += item.wagered; bet.returned += item.returned; bet.pnl += pnl; if (pnl > 0) bet.wins++; }
    }

    const surf = surfaceRows[race.surface];
    if (surf) { surf.bets++; surf.wagered += result.amountWagered; surf.returned += result.amountReturned; surf.pnl += result.profitLoss; if (result.profitLoss > 0) surf.wins++; }

    const rt = race.raceType.replace(/-/g, ' ');
    if (!raceTypeRows[rt]) raceTypeRows[rt] = mkRow(rt.charAt(0).toUpperCase() + rt.slice(1));
    const rtr = raceTypeRows[rt];
    rtr.bets++; rtr.wagered += result.amountWagered; rtr.returned += result.amountReturned; rtr.pnl += result.profitLoss; if (result.profitLoss > 0) rtr.wins++;

    const conf = race.recommendation?.confidence ?? 'none';
    const cr = confidenceRows[conf];
    if (cr) { cr.bets++; cr.wagered += result.amountWagered; cr.returned += result.amountReturned; cr.pnl += result.profitLoss; if (result.profitLoss > 0) cr.wins++; }

    const fieldSize = race.horses.filter(h => !h.scratched).length;
    const bucket = fieldSize <= 5 ? '2-5' : fieldSize <= 8 ? '6-8' : '9+';
    const fb = fieldBuckets[bucket];
    fb.bets++; fb.wagered += result.amountWagered; fb.returned += result.amountReturned; fb.pnl += result.profitLoss; if (result.profitLoss > 0) fb.wins++;

    if (!trackRows[track]) trackRows[track] = mkRow(track);
    const tr = trackRows[track];
    tr.bets++; tr.wagered += result.amountWagered; tr.returned += result.amountReturned; tr.pnl += result.profitLoss; if (result.profitLoss > 0) tr.wins++;

    totalBets++; if (result.profitLoss > 0) totalWins++;
    totalWagered += result.amountWagered; totalReturned += result.amountReturned;

    // Model top pick accuracy
    if (race.scores.length > 0) {
      modelTopTotal++;
      const topScore = [...race.scores].sort((a, b) => b.totalScore - a.totalScore)[0];
      const topHorse = topScore ? race.horses.find(h => h.id === topScore.horseEntryId) : null;
      const orderOfFinish = JSON.parse(result.orderOfFinish || '[]') as string[];
      if (topHorse && orderOfFinish[0] === topHorse.horseName) modelTopWins++;
    }

    // Rank distribution
    if (result.winnerModelRank) {
      rankTotal++;
      const bucket = result.winnerModelRank <= 3 ? result.winnerModelRank : 4;
      rankDist[bucket] = (rankDist[bucket] || 0) + 1;
    }

    // Score component correlation
    if (race.scores.length > 0) {
      const activeScores = race.scores.filter(s => !race.horses.find(h => h.id === s.horseEntryId)?.scratched);
      const orderOfFinish = JSON.parse(result.orderOfFinish || '[]') as string[];
      const winnerName = orderOfFinish[0];
      const winnerHorse = race.horses.find(h => h.horseName === winnerName);
      const winnerScore = winnerHorse ? activeScores.find(s => s.horseEntryId === winnerHorse.id) : null;

      if (winnerScore && activeScores.length > 0) {
        for (const c of SCORE_COMPONENTS) {
          const key = c.key as keyof Score;
          const fieldAvg = activeScores.reduce((sum, s) => sum + (s[key] as number), 0) / activeScores.length;
          componentSums[c.key].winnerTotal += winnerScore[key] as number;
          componentSums[c.key].fieldTotal += fieldAvg;
          componentSums[c.key].count++;
        }
      }
    }
  }

  const roi = totalWagered > 0 ? (totalReturned - totalWagered) / totalWagered : 0;
  const winRate = totalBets > 0 ? totalWins / totalBets : 0;
  const pnl = totalReturned - totalWagered;
  const modelAccuracy = modelTopTotal > 0 ? modelTopWins / modelTopTotal : 0;

  const allSorted = [...data].filter(d => d.result.betPlaced !== 'no-bet').reverse();
  let streak = 0;
  let streakType: 'W' | 'L' | null = null;
  for (const { result } of allSorted) {
    const w = result.profitLoss > 0;
    if (streakType === null) { streakType = w ? 'W' : 'L'; streak = 1; }
    else if ((w && streakType === 'W') || (!w && streakType === 'L')) streak++;
    else break;
  }

  // Component correlation results
  const componentStats = SCORE_COMPONENTS.map(c => {
    const s = componentSums[c.key];
    if (s.count === 0) return { ...c, winnerAvg: 0, fieldAvg: 0, premium: 0, count: 0 };
    const winnerAvg = s.winnerTotal / s.count;
    const fieldAvg = s.fieldTotal / s.count;
    const premium = fieldAvg > 0 ? (winnerAvg - fieldAvg) / fieldAvg : 0;
    return { ...c, winnerAvg, fieldAvg, premium, count: s.count };
  }).sort((a, b) => b.premium - a.premium);

  const hasComponentData = componentStats[0].count > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Analytics</h1>
        <p className="text-slate-400 text-sm">System performance across {data.length} completed races.</p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">P&L</div>
          <div className={`text-2xl font-bold ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}</div>
          <div className="text-slate-500 text-xs">{formatCurrency(totalWagered)} wagered</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">ROI</div>
          <div className={`text-2xl font-bold ${roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{(roi * 100).toFixed(1)}%</div>
          <div className="text-slate-500 text-xs">{totalBets} bets placed</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Win Rate</div>
          <div className="text-2xl font-bold text-white">{(winRate * 100).toFixed(0)}%</div>
          <div className="text-slate-500 text-xs">{totalWins}/{totalBets} winning bets</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Model #1 Pick</div>
          <div className="text-2xl font-bold text-white">{modelTopTotal > 0 ? `${(modelAccuracy * 100).toFixed(0)}%` : '—'}</div>
          <div className="text-slate-500 text-xs">{modelTopWins}/{modelTopTotal} times #1 won</div>
        </div>
      </div>

      {streak > 0 && streakType && (
        <div className={`rounded-xl p-3 border text-sm ${streakType === 'W' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-red-500/10 border-red-500/20 text-red-300'}`}>
          {streakType === 'W' ? `${streak}-bet winning streak` : `${streak}-bet losing streak — review model or reduce sizing`}
        </div>
      )}

      {/* Model Rank Distribution */}
      {rankTotal >= 3 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-white mb-3">Where Winners Finish in Our Model</h2>
          <div className="space-y-2">
            {[
              { rank: 1, label: '#1 Pick (model correct)', color: 'bg-emerald-500' },
              { rank: 2, label: '#2 Pick', color: 'bg-amber-500' },
              { rank: 3, label: '#3 Pick', color: 'bg-orange-500' },
              { rank: 4, label: '#4 or lower', color: 'bg-red-500' },
            ].map(({ rank, label, color }) => {
              const count = rankDist[rank] || 0;
              const pct = rankTotal > 0 ? (count / rankTotal) * 100 : 0;
              return (
                <div key={rank}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">{label}</span>
                    <span className="text-slate-400">{count}/{rankTotal} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="bg-slate-800 rounded-full h-2">
                    <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-slate-600 text-xs mt-3">Based on {rankTotal} races with recorded results</p>
        </div>
      )}

      {/* Score Component Correlation */}
      {hasComponentData && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-white mb-1">Score Factor Correlation</h2>
          <p className="text-slate-500 text-xs mb-4">Winner premium = how much higher winners score vs. the field average. Higher = more predictive.</p>
          <div className="space-y-3">
            {componentStats.map((c, i) => {
              if (c.count === 0) return null;
              const premiumPct = c.premium * 100;
              const isStrong = premiumPct >= 15;
              const isWeak = premiumPct < 5;
              const barColor = isStrong ? 'bg-emerald-500' : isWeak ? 'bg-red-500/60' : 'bg-amber-500';
              const maxPremium = Math.max(...componentStats.map(s => s.premium * 100), 1);
              return (
                <div key={c.key}>
                  <div className="flex justify-between text-xs mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 w-4 text-right">{i + 1}.</span>
                      <span className="text-white font-medium">{c.label}</span>
                      <span className="text-slate-600">(current weight: {c.weight})</span>
                    </div>
                    <span className={isStrong ? 'text-emerald-400 font-bold' : isWeak ? 'text-red-400' : 'text-amber-400'}>
                      +{premiumPct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="bg-slate-800 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${(premiumPct / maxPremium) * 100}%` }} />
                  </div>
                  <div className="flex gap-4 mt-0.5 text-xs text-slate-600">
                    <span>Winners avg: {c.winnerAvg.toFixed(1)}</span>
                    <span>Field avg: {c.fieldAvg.toFixed(1)}</span>
                  </div>
                </div>
              );
            })}
          </div>
          {componentStats[0].count < 20 && (
            <p className="text-slate-600 text-xs mt-3">
              ⓘ {componentStats[0].count} races recorded — weight adjustments unlock at 50 races.
            </p>
          )}
        </div>
      )}

      <Table title="By Bet Type" rows={Object.values(betTypeRows)} />
      <Table title="By Track" rows={Object.values(trackRows)} />
      <Table title="By Surface" rows={Object.values(surfaceRows)} />
      <Table title="By Race Type" rows={Object.values(raceTypeRows)} />
      <Table title="By Confidence Level" rows={Object.values(confidenceRows)} />
      <Table title="By Field Size" rows={Object.values(fieldBuckets)} />

      {/* System Insights */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <h2 className="text-sm font-semibold text-white mb-3">System Insights</h2>
        <div className="space-y-2 text-sm text-slate-400">
          {roi < -0.15 && (<div className="flex gap-2"><span className="text-red-400">⚠</span><span>ROI below -15% — consider passing more races or reducing bet sizes.</span></div>)}
          {roi >= 0.10 && (<div className="flex gap-2"><span className="text-emerald-400">✓</span><span>ROI above +10% — model is showing positive edge. Stay disciplined.</span></div>)}
          {surfaceRows.dirt.bets > 0 && surfaceRows.turf.bets > 0 && (
            <div className="flex gap-2"><span className="text-amber-400">→</span>
              <span>Dirt ROI: {surfaceRows.dirt.wagered > 0 ? (surfaceRows.dirt.pnl / surfaceRows.dirt.wagered * 100).toFixed(1) : 'n/a'}% vs Turf ROI: {surfaceRows.turf.wagered > 0 ? (surfaceRows.turf.pnl / surfaceRows.turf.wagered * 100).toFixed(1) : 'n/a'}% — focus on your stronger surface.</span>
            </div>
          )}
          {modelAccuracy < 0.25 && modelTopTotal >= 5 && (<div className="flex gap-2"><span className="text-orange-400">⚠</span><span>Model top pick wins only {(modelAccuracy * 100).toFixed(0)}% — review speed and class weights.</span></div>)}
          {confidenceRows.high.bets > 0 && (<div className="flex gap-2"><span className="text-blue-400">→</span><span>High-confidence ROI: {confidenceRows.high.wagered > 0 ? (confidenceRows.high.pnl / confidenceRows.high.wagered * 100).toFixed(1) : 'n/a'}%</span></div>)}
          {hasComponentData && componentStats[0].count >= 10 && (
            <div className="flex gap-2"><span className="text-amber-400">→</span>
              <span><strong className="text-white">{componentStats[0].label}</strong> is your strongest predictor (+{(componentStats[0].premium * 100).toFixed(1)}% winner premium). <strong className="text-white">{componentStats[componentStats.length - 1].label}</strong> is weakest (+{(componentStats[componentStats.length - 1].premium * 100).toFixed(1)}%).</span>
            </div>
          )}
          {totalBets < 10 && (<div className="flex gap-2"><span className="text-slate-500">ⓘ</span><span>Sample size is small ({totalBets} bets) — conclusions not yet reliable.</span></div>)}
        </div>
      </div>
    </div>
  );
}
