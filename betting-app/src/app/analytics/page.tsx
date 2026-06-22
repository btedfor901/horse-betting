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

interface Score { horseEntryId: string; totalScore: number; }
interface Horse { id: string; horseName: string; scratched: boolean; }
interface Rec { betType: string; confidence: string; }
interface Result {
  betPlaced: string; amountWagered: number; amountReturned: number;
  profitLoss: number; orderOfFinish: string;
}
interface Race {
  id: string; surface: string; raceType: string;
  horses: Horse[]; scores: Score[];
  recommendation?: Rec;
  result?: Result;
}
interface RaceDay { id: string; date: string; races: Race[]; }

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
    d.races.filter(r => r.result != null).map(r => ({ race: r, result: r.result! }))
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

  const betTypeRows: Record<BetType, StatRow> = {
    'no-bet': mkRow('No Bet (pass)'),
    'win': mkRow('Win'),
    'place': mkRow('Place'),
    'show': mkRow('Show'),
    'exacta-box': mkRow('Exacta Box'),
    'trifecta-box': mkRow('Trifecta Box'),
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

  let totalBets = 0, totalWins = 0, totalWagered = 0, totalReturned = 0;
  let modelTopWins = 0, modelTopTotal = 0;

  for (const { race, result } of data) {
    if (result.betPlaced === 'no-bet') continue;

    // Parse multi-bet JSON or fall back to single-bet legacy format
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
      if (bet) {
        bet.bets++; bet.wagered += item.wagered;
        bet.returned += item.returned; bet.pnl += pnl;
        if (pnl > 0) bet.wins++;
      }
    }

    const surf = surfaceRows[race.surface];
    if (surf) {
      surf.bets++; surf.wagered += result.amountWagered;
      surf.returned += result.amountReturned; surf.pnl += result.profitLoss;
      if (result.profitLoss > 0) surf.wins++;
    }

    const rt = race.raceType.replace(/-/g, ' ');
    if (!raceTypeRows[rt]) raceTypeRows[rt] = mkRow(rt.charAt(0).toUpperCase() + rt.slice(1));
    const rtr = raceTypeRows[rt];
    rtr.bets++; rtr.wagered += result.amountWagered;
    rtr.returned += result.amountReturned; rtr.pnl += result.profitLoss;
    if (result.profitLoss > 0) rtr.wins++;

    const conf = race.recommendation?.confidence ?? 'none';
    const cr = confidenceRows[conf];
    if (cr) {
      cr.bets++; cr.wagered += result.amountWagered;
      cr.returned += result.amountReturned; cr.pnl += result.profitLoss;
      if (result.profitLoss > 0) cr.wins++;
    }

    const fieldSize = race.horses.filter(h => !h.scratched).length;
    const bucket = fieldSize <= 5 ? '2-5' : fieldSize <= 8 ? '6-8' : '9+';
    const fb = fieldBuckets[bucket];
    fb.bets++; fb.wagered += result.amountWagered;
    fb.returned += result.amountReturned; fb.pnl += result.profitLoss;
    if (result.profitLoss > 0) fb.wins++;

    totalBets++; if (result.profitLoss > 0) totalWins++;
    totalWagered += result.amountWagered; totalReturned += result.amountReturned;

    if (race.scores.length > 0) {
      modelTopTotal++;
      const topScore = [...race.scores].sort((a, b) => b.totalScore - a.totalScore)[0];
      const topHorse = topScore ? race.horses.find(h => h.id === topScore.horseEntryId) : null;
      const orderOfFinish = JSON.parse(result.orderOfFinish || '[]') as string[];
      if (topHorse && orderOfFinish[0] === topHorse.horseName) modelTopWins++;
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Analytics</h1>
        <p className="text-slate-400 text-sm">System performance across {data.length} completed races.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">P&L</div>
          <div className={`text-2xl font-bold ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}
          </div>
          <div className="text-slate-500 text-xs">{formatCurrency(totalWagered)} wagered</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">ROI</div>
          <div className={`text-2xl font-bold ${roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {(roi * 100).toFixed(1)}%
          </div>
          <div className="text-slate-500 text-xs">{totalBets} bets placed</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Win Rate</div>
          <div className="text-2xl font-bold text-white">{(winRate * 100).toFixed(0)}%</div>
          <div className="text-slate-500 text-xs">{totalWins}/{totalBets} winning bets</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Model Top Pick</div>
          <div className="text-2xl font-bold text-white">
            {modelTopTotal > 0 ? `${(modelAccuracy * 100).toFixed(0)}%` : '—'}
          </div>
          <div className="text-slate-500 text-xs">{modelTopWins}/{modelTopTotal} times #1 won</div>
        </div>
      </div>

      {streak > 0 && streakType && (
        <div className={`rounded-xl p-3 border text-sm ${
          streakType === 'W'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
            : 'bg-red-500/10 border-red-500/20 text-red-300'
        }`}>
          {streakType === 'W' ? `${streak}-bet winning streak` : `${streak}-bet losing streak — review model or reduce sizing`}
        </div>
      )}

      <Table title="By Bet Type" rows={Object.values(betTypeRows)} />
      <Table title="By Surface" rows={Object.values(surfaceRows)} />
      <Table title="By Race Type" rows={Object.values(raceTypeRows)} />
      <Table title="By Confidence Level" rows={Object.values(confidenceRows)} />
      <Table title="By Field Size" rows={Object.values(fieldBuckets)} />

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <h2 className="text-sm font-semibold text-white mb-3">System Insights</h2>
        <div className="space-y-2 text-sm text-slate-400">
          {roi < -0.15 && (
            <div className="flex gap-2"><span className="text-red-400">⚠</span>
              <span>ROI below -15% — consider passing more races or reducing bet sizes.</span></div>
          )}
          {roi >= 0.10 && (
            <div className="flex gap-2"><span className="text-emerald-400">✓</span>
              <span>ROI above +10% — model is showing positive edge. Stay disciplined.</span></div>
          )}
          {surfaceRows.dirt.bets > 0 && surfaceRows.turf.bets > 0 && (
            <div className="flex gap-2"><span className="text-amber-400">→</span>
              <span>
                Dirt ROI: {surfaceRows.dirt.wagered > 0 ? (surfaceRows.dirt.pnl / surfaceRows.dirt.wagered * 100).toFixed(1) : 'n/a'}% vs
                Turf ROI: {surfaceRows.turf.wagered > 0 ? (surfaceRows.turf.pnl / surfaceRows.turf.wagered * 100).toFixed(1) : 'n/a'}%
                {' — focus on your stronger surface.'}
              </span></div>
          )}
          {modelAccuracy < 0.25 && modelTopTotal >= 5 && (
            <div className="flex gap-2"><span className="text-orange-400">⚠</span>
              <span>Model top pick wins only {(modelAccuracy * 100).toFixed(0)}% — review speed and class weights.</span></div>
          )}
          {confidenceRows.high.bets > 0 && (
            <div className="flex gap-2"><span className="text-blue-400">→</span>
              <span>High-confidence ROI: {confidenceRows.high.wagered > 0 ? (confidenceRows.high.pnl / confidenceRows.high.wagered * 100).toFixed(1) : 'n/a'}%</span></div>
          )}
          {totalBets < 10 && (
            <div className="flex gap-2"><span className="text-slate-500">ⓘ</span>
              <span>Sample size is small ({totalBets} bets) — conclusions not yet reliable.</span></div>
          )}
        </div>
      </div>
    </div>
  );
}
