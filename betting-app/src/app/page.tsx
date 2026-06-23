'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { getBetLabel, getBetBg, getBetColor, formatCurrency } from '@/lib/bankroll';

interface Settings {
  startingBankroll: number; currentBankroll: number; unitSize: number;
  dailyStopLoss: number; dailyProfitTarget: number; maxBetsPerDay: number;
}

interface Rec { betType: string; horses: string; totalCost: number; }
interface Result { profitLoss: number; betPlaced: string; amountWagered: number; }
interface Score { rank: number; horseName: string; totalScore: number; }
interface Race {
  id: string; number: number; distance: string; surface: string; postTime?: string;
  recommendation?: Rec; result?: Result; scores: Score[];
}
interface RaceDay { id: string; date: string; track: string; races: Race[]; }

export default function Dashboard() {
  const [days, setDays] = useState<RaceDay[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getRaceDays(), api.getSettings()])
      .then(([d, s]) => { setDays(d as RaceDay[]); setSettings(s as Settings); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-slate-400 text-sm">Loading...</div>;
  if (!settings) return null;

  const today = new Date().toISOString().split('T')[0];
  const todayDay = days.find(d => d.date === today);

  const allResults = days.flatMap(d => d.races.map(r => r.result).filter(Boolean)) as Result[];
  const bets = allResults.filter(r => r.betPlaced !== 'no-bet');
  const wins = bets.filter(r => r.profitLoss > 0).length;
  const totalPnL = allResults.reduce((s, r) => s + r.profitLoss, 0);
  const totalWagered = bets.reduce((s, r) => s + r.amountWagered, 0);
  const roi = totalWagered > 0 ? totalPnL / totalWagered : 0;

  const todayRaces = todayDay?.races ?? [];
  const todayPnL = todayRaces.reduce((s, r) => s + (r.result?.profitLoss ?? 0), 0);
  const todayBetsPlaced = todayRaces.filter(r => r.result && r.result.betPlaced !== 'no-bet').length;
  const todayBetsRec = todayRaces.filter(r => r.recommendation && r.recommendation.betType !== 'no-bet').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-0.5">Churchill Downs · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <Link href="/race-day/new" className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-4 py-2 rounded-lg text-sm transition-colors">
          + Race Day
        </Link>
      </div>

      {/* Overall stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Bankroll', value: formatCurrency(settings.currentBankroll), sub: `Start: ${formatCurrency(settings.startingBankroll)}`, color: 'text-white' },
          { label: 'Overall P&L', value: `${totalPnL >= 0 ? '+' : ''}${formatCurrency(totalPnL)}`, sub: `${bets.length} bets`, color: totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400' },
          { label: 'ROI', value: `${(roi * 100).toFixed(1)}%`, sub: `${formatCurrency(totalWagered)} wagered`, color: roi >= 0 ? 'text-emerald-400' : 'text-red-400' },
          { label: 'Win Rate', value: bets.length > 0 ? `${((wins / bets.length) * 100).toFixed(0)}%` : '—', sub: `${wins}/${bets.length} wins`, color: 'text-white' },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">{label}</div>
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-slate-500 text-xs">{sub}</div>
          </div>
        ))}
      </div>

      {/* Today's card */}
      {todayDay ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between p-4 border-b border-slate-800">
            <div>
              <div className="text-white font-semibold">Today's Card</div>
              <div className="text-slate-400 text-xs">{todayRaces.length} races · {todayBetsRec} bets recommended</div>
            </div>
            <div className="flex items-center gap-3">
              {todayPnL !== 0 && (
                <span className={`text-sm font-bold ${todayPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {todayPnL >= 0 ? '+' : ''}{formatCurrency(todayPnL)}
                </span>
              )}
              <Link href={`/race-day/${todayDay.id}`} className="text-amber-400 hover:text-amber-300 text-sm">View all →</Link>
            </div>
          </div>
          <div className="divide-y divide-slate-800">
            {todayRaces.length === 0 ? (
              <div className="p-6 text-center">
                <div className="text-slate-500 text-sm mb-2">No races added yet</div>
                <div className="flex gap-3 justify-center">
                  <Link href="/race-day/new" className="text-amber-400 text-sm hover:text-amber-300">Grab Screenshots →</Link>
                  <span className="text-slate-600">or</span>
                  <Link href={`/race-day/${todayDay.id}`} className="text-slate-400 text-sm hover:text-white">Add manually →</Link>
                </div>
              </div>
            ) : (
              todayRaces.map(race => {
                const rec = race.recommendation;
                const res = race.result;
                const topScore = race.scores?.find(s => s.rank === 1);
                const recHorses = rec?.horses ? (Array.isArray(rec.horses) ? rec.horses : JSON.parse(rec.horses as string)) : [];
                return (
                  <Link key={race.id} href={`/race/${race.id}`} className="flex items-center gap-3 p-3 hover:bg-slate-800/50 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                      <span className="text-white text-xs font-bold">{race.number}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-medium">Race {race.number}</span>
                        <span className="text-slate-500 text-xs">{race.distance} · {race.surface}</span>
                      </div>
                      {topScore && (
                        <div className="text-slate-500 text-xs">
                          Top: <span className="text-white">{topScore.horseName}</span>
                          <span className="text-amber-400 ml-1">({topScore.totalScore})</span>
                          {recHorses.length > 0 && <span className="text-slate-600"> · {recHorses.join(' / ')}</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {rec && (
                        <span className={`px-2 py-0.5 rounded border text-xs font-medium ${getBetBg(rec.betType as never)} ${getBetColor(rec.betType as never)}`}>
                          {getBetLabel(rec.betType as never)}
                          {rec.betType !== 'no-bet' && ` $${rec.totalCost}`}
                        </span>
                      )}
                      {res && (
                        <span className={`text-sm font-bold ${res.profitLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {res.profitLoss >= 0 ? '+' : ''}{formatCurrency(res.profitLoss)}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-dashed border-slate-700 rounded-xl p-10 text-center">
          <div className="text-slate-400 mb-2">No race day for today</div>
          <div className="flex gap-4 justify-center mt-4">
            <Link href="/race-day/new" className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-4 py-2 rounded-lg text-sm transition-colors">
              + Race Day
            </Link>
          </div>
        </div>
      )}

      {/* Daily limits */}
      {todayDay && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Stop-Loss', limit: settings.dailyStopLoss, current: Math.abs(Math.min(todayPnL, 0)), color: 'bg-red-500', show: todayPnL < 0 },
            { label: 'Profit Target', limit: settings.dailyProfitTarget, current: Math.max(todayPnL, 0), color: 'bg-emerald-500', show: todayPnL > 0 },
            { label: 'Bets Today', limit: settings.maxBetsPerDay, current: todayBetsPlaced, color: 'bg-amber-500', show: true, isCount: true },
          ].map(({ label, limit, current, color, show, isCount }) => (
            <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-3">
              <div className="text-slate-500 text-xs mb-1">{label}</div>
              <div className="text-white font-bold">{isCount ? `${current}/${limit}` : formatCurrency(limit)}</div>
              {show && (
                <>
                  <div className="bg-slate-800 rounded-full h-1.5 mt-1">
                    <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${Math.min(100, (current / limit) * 100)}%` }} />
                  </div>
                  {!isCount && <div className="text-xs mt-0.5" style={{ color: color.includes('red') ? '#f87171' : '#34d399' }}>{formatCurrency(current)}</div>}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Recent days */}
      {days.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Recent Race Days</h2>
          <div className="space-y-2">
            {days.slice(0, 6).map(day => {
              const pnl = day.races.reduce((s, r) => s + (r.result?.profitLoss ?? 0), 0);
              const betCount = day.races.filter(r => r.result && r.result.betPlaced !== 'no-bet').length;
              const dateStr = new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
              return (
                <Link key={day.id} href={`/race-day/${day.id}`} className="flex items-center justify-between bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-3 transition-colors">
                  <div>
                    <span className="text-white text-sm font-medium">{dateStr}</span>
                    <span className="text-amber-400/70 text-xs ml-2">{day.track}</span>
                    <span className="text-slate-500 text-xs ml-2">{day.races.length} races · {betCount} bets</span>
                  </div>
                  {betCount > 0 && (
                    <span className={`text-sm font-bold ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
