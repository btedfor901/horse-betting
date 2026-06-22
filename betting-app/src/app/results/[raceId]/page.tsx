'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { getBetLabel, formatCurrency } from '@/lib/bankroll';
import { BetType } from '@/lib/types';

const BET_OPTIONS: { value: BetType; label: string }[] = [
  { value: 'win',          label: 'Win' },
  { value: 'place',        label: 'Place' },
  { value: 'show',         label: 'Show' },
  { value: 'exacta-box',   label: 'Exacta Box' },
  { value: 'trifecta-box', label: 'Trifecta Box' },
];

interface BetEntry {
  _id: string;
  type: BetType;
  wagered: string;
  returned: string;
}

function newBet(type: BetType = 'win'): BetEntry {
  return { _id: crypto.randomUUID(), type, wagered: '', returned: '' };
}

// Parse betPlaced field: old format is a plain string, new format is a JSON array
function parseBetPlaced(
  betPlaced: string,
  amountWagered: number,
  amountReturned: number,
): BetEntry[] {
  if (!betPlaced || betPlaced === 'no-bet') return [];
  try {
    if (betPlaced.startsWith('[')) {
      const arr = JSON.parse(betPlaced) as { type: BetType; wagered: number; returned: number }[];
      return arr.map(b => ({ _id: crypto.randomUUID(), type: b.type, wagered: String(b.wagered), returned: String(b.returned) }));
    }
  } catch { /* fall through */ }
  // Legacy single-bet format
  return [{ _id: crypto.randomUUID(), type: betPlaced as BetType, wagered: String(amountWagered), returned: String(amountReturned) }];
}

interface Horse { id: string; horseName: string; scratched: boolean; postPosition: number; }
interface Score { horseEntryId: string; totalScore: number; }
interface Rec { betType: string; horses: string; totalCost: number; }
interface RaceResult { winner: string; orderOfFinish: string; betPlaced: string; amountWagered: number; amountReturned: number; notes?: string; }
interface Race {
  id: string; raceDayId: string; number: number; distance: string; surface: string;
  raceType: string; postTime?: string;
  horses: Horse[]; scores: Score[];
  recommendation?: Rec;
  result?: RaceResult;
}

export default function ResultsPage() {
  const { raceId } = useParams<{ raceId: string }>();
  const router = useRouter();
  const [race, setRace] = useState<Race | null>(null);
  const [saved, setSaved] = useState(false);

  const [winner, setWinner] = useState('');
  const [orderRaw, setOrderRaw] = useState('');
  const [bets, setBets] = useState<BetEntry[]>([newBet('win')]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    api.getRace(raceId)
      .then(r => {
        const race = r as Race;
        setRace(race);
        if (race.result) {
          setWinner(race.result.winner);
          const order = JSON.parse(race.result.orderOfFinish || '[]') as string[];
          setOrderRaw(order.join(', '));
          const parsed = parseBetPlaced(race.result.betPlaced, race.result.amountWagered, race.result.amountReturned);
          setBets(parsed.length > 0 ? parsed : [newBet('win')]);
          setNotes(race.result.notes || '');
        } else if (race.recommendation) {
          const rec = race.recommendation;
          if (rec.betType !== 'no-bet') {
            setBets([{ _id: crypto.randomUUID(), type: rec.betType as BetType, wagered: rec.totalCost.toFixed(2), returned: '' }]);
          }
        }
      })
      .catch(() => router.push('/'));
  }, [raceId, router]);

  if (!race) return <div className="text-slate-400 text-sm">Loading...</div>;

  const activeHorses = race.horses.filter(h => !h.scratched).sort((a, b) => a.postPosition - b.postPosition);
  const rec = race.recommendation;
  const recHorses = rec?.horses ? (JSON.parse(rec.horses) as string[]) : [];

  const scoredHorses = [...race.scores]
    .filter(s => !race.horses.find(h => h.id === s.horseEntryId)?.scratched)
    .sort((a, b) => b.totalScore - a.totalScore)
    .map(s => ({ ...s, horseName: race.horses.find(h => h.id === s.horseEntryId)?.horseName ?? '' }));

  function updateBet(id: string, field: keyof BetEntry, value: string) {
    setBets(prev => prev.map(b => b._id === id ? { ...b, [field]: value } : b));
  }
  function addBet() { setBets(prev => [...prev, newBet('win')]); }
  function removeBet(id: string) { setBets(prev => prev.filter(b => b._id !== id)); }

  // Totals across all bets
  const totalWagered = bets.reduce((s, b) => s + (parseFloat(b.wagered) || 0), 0);
  const totalReturned = bets.reduce((s, b) => s + (parseFloat(b.returned) || 0), 0);
  const totalPnL = totalReturned - totalWagered;
  const hasAnyWagered = totalWagered > 0;

  async function handleSave() {
    if (!race) return;
    const validBets = bets.filter(b => parseFloat(b.wagered) > 0);

    // Per-type payouts for the API
    const sum = (type: string) => validBets.filter(b => b.type === type).reduce((s, b) => s + (parseFloat(b.returned) || 0), 0);

    await api.saveResults(race.id, {
      winner,
      orderOfFinish: orderRaw.split(',').map(s => s.trim()).filter(Boolean),
      // Store bets as JSON array in betPlaced; fall back to 'no-bet' if none
      betPlaced: validBets.length > 0 ? JSON.stringify(validBets.map(b => ({ type: b.type, wagered: parseFloat(b.wagered) || 0, returned: parseFloat(b.returned) || 0 }))) : 'no-bet',
      amountWagered: totalWagered,
      amountReturned: totalReturned,
      winPayout: sum('win') || undefined,
      placePayout: sum('place') || undefined,
      showPayout: sum('show') || undefined,
      exactaPayout: sum('exacta-box') || undefined,
      trifectaPayout: sum('trifecta-box') || undefined,
      notes,
    });
    setSaved(true);
    setTimeout(() => router.push(`/race-day/${race.raceDayId}`), 1200);
  }

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-3 mb-5">
        <Link href={`/race/${race.id}`} className="text-slate-500 hover:text-white text-sm">
          ← Race {race.number}
        </Link>
        <span className="text-slate-700">/</span>
        <span className="text-white font-semibold">Enter Results</span>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-4 text-sm">
        <div className="text-slate-400">
          Race {race.number} · {race.distance} · {race.surface} · {race.raceType.replace(/-/g, ' ')}
          {race.postTime && ` · ${race.postTime}`}
        </div>
        {rec && rec.betType !== 'no-bet' && (
          <div className="mt-2 text-slate-300">
            Recommended: <span className="text-amber-400 font-medium">{getBetLabel(rec.betType as BetType)}</span>
            {recHorses.length > 0 && <span> — {recHorses.join(' / ')}</span>}
            <span className="text-slate-500"> (${rec.totalCost})</span>
          </div>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">

        {/* Finish Order */}
        <div>
          <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-3">Finish Order</h2>
          <div className="mb-3">
            <label className="text-xs text-slate-400 block mb-1">Winner (1st place)</label>
            <select value={winner} onChange={e => setWinner(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500">
              <option value="">Select winner...</option>
              {activeHorses.map(h => (
                <option key={h.id} value={h.horseName}>{h.postPosition}. {h.horseName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Full order of finish (comma separated)</label>
            <input type="text" placeholder="Horse A, Horse B, Horse C..." value={orderRaw}
              onChange={e => setOrderRaw(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500" />
          </div>
        </div>

        {/* Bets */}
        <div className="border-t border-slate-800 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wider">Bets Placed</h2>
            <button onClick={addBet}
              className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-3 py-1 rounded transition-colors">
              + Add Bet
            </button>
          </div>

          <div className="space-y-2">
            {bets.map(bet => (
              <div key={bet._id} className="flex items-center gap-2">
                {/* Bet type */}
                <select value={bet.type} onChange={e => updateBet(bet._id, 'type', e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded px-2 py-2 text-white text-sm focus:outline-none focus:border-amber-500 flex-shrink-0">
                  {BET_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                {/* Wagered */}
                <div className="flex-1">
                  <input type="number" placeholder="Wagered $" value={bet.wagered}
                    onChange={e => updateBet(bet._id, 'wagered', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
                    min="0" step="0.50" />
                </div>
                {/* Returned */}
                <div className="flex-1">
                  <input type="number" placeholder="Returned $" value={bet.returned}
                    onChange={e => updateBet(bet._id, 'returned', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
                    min="0" step="0.10" />
                </div>
                {/* Per-bet P&L */}
                {(parseFloat(bet.wagered) > 0 || parseFloat(bet.returned) > 0) && (
                  <div className={`text-xs font-bold w-14 text-right shrink-0 ${(parseFloat(bet.returned) || 0) - (parseFloat(bet.wagered) || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {(() => { const pnl = (parseFloat(bet.returned) || 0) - (parseFloat(bet.wagered) || 0); return (pnl >= 0 ? '+' : '') + formatCurrency(pnl); })()}
                  </div>
                )}
                {/* Remove */}
                {bets.length > 1 && (
                  <button onClick={() => removeBet(bet._id)}
                    className="text-slate-600 hover:text-red-400 text-lg leading-none shrink-0 transition-colors">
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Column labels */}
          <div className="flex gap-2 mt-1 text-xs text-slate-600">
            <div className="flex-shrink-0 w-[110px]">Type</div>
            <div className="flex-1">Wagered</div>
            <div className="flex-1">Returned</div>
          </div>
        </div>

        {/* Total P&L */}
        {hasAnyWagered && (
          <div className={`rounded-lg p-3 border ${totalPnL >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-slate-300">Total P / L</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {formatCurrency(totalWagered)} wagered · {formatCurrency(totalReturned)} returned
                  {bets.length > 1 && ` · ${bets.filter(b => parseFloat(b.wagered) > 0).length} bets`}
                </div>
              </div>
              <span className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {totalPnL >= 0 ? '+' : ''}{formatCurrency(totalPnL)}
              </span>
            </div>
            {bets.length > 1 && (
              <div className="mt-2 pt-2 border-t border-slate-700/50 space-y-1">
                {bets.filter(b => parseFloat(b.wagered) > 0).map(b => {
                  const pnl = (parseFloat(b.returned) || 0) - (parseFloat(b.wagered) || 0);
                  return (
                    <div key={b._id} className="flex justify-between text-xs">
                      <span className="text-slate-400">{getBetLabel(b.type)}</span>
                      <span className={pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                        {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        <div className="border-t border-slate-800 pt-4">
          <label className="text-xs text-slate-400 block mb-1">Notes (optional)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="What happened? Did the model's top pick win? Any pace notes for next time..."
            rows={3}
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500 resize-none" />
        </div>

        {/* Model rankings */}
        {scoredHorses.length > 0 && (
          <div className="border-t border-slate-800 pt-4">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Model Rankings (reference)</div>
            <div className="space-y-1">
              {scoredHorses.map((s, i) => (
                <div key={s.horseEntryId} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 w-4">#{i + 1}</span>
                    <span className={winner === s.horseName ? 'text-emerald-400 font-bold' : 'text-slate-300'}>
                      {s.horseName}{winner === s.horseName && ' ✓'}
                    </span>
                  </div>
                  <span className="text-slate-500">{s.totalScore}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <button onClick={handleSave} disabled={!winner || saved}
        className="mt-4 w-full bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 font-bold py-3 rounded-lg transition-colors">
        {saved ? '✓ Results saved — returning...' : 'Save Results'}
      </button>
    </div>
  );
}
