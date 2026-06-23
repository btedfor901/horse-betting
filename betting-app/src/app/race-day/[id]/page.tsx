'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { getBetLabel, getBetBg, getBetColor, formatCurrency } from '@/lib/bankroll';

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const SURFACES = ['dirt', 'turf', 'synthetic'];
const RACE_TYPES = [
  'claiming', 'optional-claiming', 'allowance', 'maiden',
  'maiden-special-weight', 'stakes', 'handicap',
];

interface Rec { betType: string; totalCost: number; }
interface Result { profitLoss: number; betPlaced: string; }
interface Score { rank: number; horseName?: string; totalScore: number; horseEntryId: string; }
interface Horse { id: string; horseName: string; scratched: boolean; }
interface Race {
  id: string; raceDayId: string; number: number; distance: string; surface: string;
  raceType: string; postTime?: string; purse?: string; conditions?: string;
  horses: Horse[]; scores: Score[];
  recommendation?: Rec; result?: Result;
}
interface RaceDay { id: string; date: string; track: string; races: Race[]; }

export default function RaceDayPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  // "new" mode state
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTrack, setNewTrack] = useState('Churchill Downs');
  const [creating, setCreating] = useState(false);

  // existing day state
  const [day, setDay] = useState<RaceDay | null>(null);
  const [loading, setLoading] = useState(id !== 'new');
  const [showAddRace, setShowAddRace] = useState(false);
  const [liveStatus, setLiveStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [liveMsg, setLiveMsg] = useState('');
  const [newRace, setNewRace] = useState({
    number: 1, postTime: '', distance: '1M', surface: 'dirt',
    raceType: 'claiming', purse: '', conditions: '',
  });
  const [addingRace, setAddingRace] = useState(false);

  useEffect(() => {
    if (id === 'new') return;
    api.getRaceDay(id)
      .then(d => {
        const day = d as RaceDay;
        setDay(day);
        setNewRace(prev => ({ ...prev, number: (day.races.length || 0) + 1 }));
      })
      .catch(() => router.push('/'))
      .finally(() => setLoading(false));
  }, [id, router]);

  async function createDay() {
    setCreating(true);
    try {
      const d = await api.createRaceDay({ date: newDate, track: newTrack }) as RaceDay;
      router.push(`/race-day/${d.id}`);
    } catch (e) {
      console.error(e);
      setCreating(false);
    }
  }

  async function grabLiveLines() {
    if (!day) return;
    setLiveStatus('running');
    setLiveMsg('Starting capture...');
    try {
      const res = await fetch('/api/capture-screenshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tracks: [day.track], date: day.date, liveOnly: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLiveStatus('done');
      setLiveMsg('Browser launched — screenshots will be ready in ~2 min.');
    } catch (e) {
      setLiveStatus('error');
      setLiveMsg(String(e));
    }
  }

  async function deleteRace(raceId: string, raceNumber: number, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete Race ${raceNumber}? This cannot be undone.`)) return;
    try {
      await fetch(`/api/races/${raceId}`, { method: 'DELETE' });
      setDay(prev => prev ? { ...prev, races: prev.races.filter(r => r.id !== raceId) } : prev);
    } catch (err) {
      console.error(err);
    }
  }

  async function addRace() {
    if (!day) return;
    setAddingRace(true);
    try {
      const race = await api.createRace({
        raceDayId: day.id,
        number: newRace.number,
        distance: newRace.distance,
        surface: newRace.surface,
        raceType: newRace.raceType,
        postTime: newRace.postTime || undefined,
        purse: newRace.purse || undefined,
        conditions: newRace.conditions || undefined,
      }) as Race;
      router.push(`/race/${race.id}`);
    } catch (e) {
      console.error(e);
      setAddingRace(false);
    }
  }

  // --- NEW race day creation form ---
  if (id === 'new') {
    return (
      <div className="max-w-md">
        <h1 className="text-2xl font-bold text-white mb-5">New Race Day</h1>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Race Date</label>
            <input
              type="date"
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Track</label>
            <input
              type="text"
              value={newTrack}
              onChange={e => setNewTrack(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
            />
          </div>
          <button
            onClick={createDay}
            disabled={creating || !newDate}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 font-bold py-2.5 rounded-lg text-sm transition-colors"
          >
            {creating ? 'Creating...' : 'Create Race Day →'}
          </button>
        </div>
      </div>
    );
  }

  if (loading) return <div className="text-slate-400 text-sm">Loading...</div>;
  if (!day) return null;

  const dateFormatted = new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
  const totalPnL = day.races.reduce((s, r) => s + (r.result?.profitLoss ?? 0), 0);
  const betsPlaced = day.races.filter(r => r.result && r.result.betPlaced !== 'no-bet').length;

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="text-slate-400 text-sm mb-1">{day.track}</div>
          <h1 className="text-2xl font-bold text-white">{dateFormatted}</h1>
          <div className="flex gap-4 mt-2 text-sm">
            <span className="text-slate-400">{day.races.length} race{day.races.length !== 1 ? 's' : ''}</span>
            {betsPlaced > 0 && (
              <span className={totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                {totalPnL >= 0 ? '+' : ''}{formatCurrency(totalPnL)} P&L
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <button
              onClick={grabLiveLines}
              disabled={liveStatus === 'running'}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold px-3 py-2 rounded-lg text-sm transition-colors"
            >
              {liveStatus === 'running' ? '⏳' : '📡'} Live Lines
            </button>
            <button
              onClick={() => setShowAddRace(true)}
              className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-4 py-2 rounded-lg text-sm transition-colors"
            >
              + Add Race
            </button>
          </div>
          {liveMsg && (
            <span className={`text-xs ${liveStatus === 'done' ? 'text-emerald-400' : liveStatus === 'error' ? 'text-red-400' : 'text-amber-400'}`}>
              {liveMsg}
            </span>
          )}
        </div>
      </div>

      {/* Screenshots viewer — show if screenshots exist for this day/track */}
      {day.races.length > 0 && (
        <div className="mb-5 bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-slate-300">Race Card Screenshots</div>
            <span className="text-xs text-slate-500">/screenshots/{day.date}/{slugify(day.track)}/</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {day.races.map(race => (
              <a
                key={race.id}
                href={`/screenshots/${day.date}/${slugify(day.track)}/race-${race.number}/advanced.png`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-xs text-slate-300 hover:text-white transition-colors"
              >
                R{race.number}
              </a>
            ))}
          </div>
          <div className="flex gap-3 mt-2">
            {(['advanced', 'speed', 'class', 'pace', 'tips'] as const).map(tab => (
              <a
                key={tab}
                href={`/screenshots/${day.date}/${slugify(day.track)}/race-1/${tab}.png`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 capitalize"
              >
                {tab} ↗
              </a>
            ))}
          </div>
        </div>
      )}

      {showAddRace && (
        <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-5 mb-5">
          <h2 className="text-white font-semibold mb-4">Add Race {newRace.number}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            {([
              ['Race #', 'number', 'number'],
              ['Post Time', 'postTime', 'text', '11:45 AM'],
              ['Distance', 'distance', 'text', '1M, 6f'],
            ] as const).map(([label, key, type, ph]) => (
              <div key={key}>
                <label className="text-xs text-slate-400 block mb-1">{label}</label>
                <input type={type} placeholder={ph ?? ''} value={(newRace as Record<string, string | number>)[key]}
                  onChange={e => setNewRace(p => ({ ...p, [key]: type === 'number' ? parseInt(e.target.value) || 1 : e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-amber-500" />
              </div>
            ))}
            <div>
              <label className="text-xs text-slate-400 block mb-1">Surface</label>
              <select value={newRace.surface} onChange={e => setNewRace(p => ({ ...p, surface: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-amber-500">
                {SURFACES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Race Type</label>
              <select value={newRace.raceType} onChange={e => setNewRace(p => ({ ...p, raceType: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-amber-500">
                {RACE_TYPES.map(t => <option key={t} value={t}>{t.replace(/-/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Purse</label>
              <input type="text" placeholder="$78K" value={newRace.purse}
                onChange={e => setNewRace(p => ({ ...p, purse: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-amber-500" />
            </div>
          </div>
          <div className="mb-3">
            <label className="text-xs text-slate-400 block mb-1">Conditions (optional)</label>
            <input type="text" placeholder="4YO+ F&M, 1M, Dirt — $40K Claiming" value={newRace.conditions}
              onChange={e => setNewRace(p => ({ ...p, conditions: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-amber-500" />
          </div>
          <div className="flex gap-2">
            <button onClick={addRace} disabled={addingRace}
              className="bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 font-bold px-4 py-1.5 rounded text-sm transition-colors">
              {addingRace ? 'Adding...' : 'Add & Enter Horses →'}
            </button>
            <button onClick={() => setShowAddRace(false)} className="text-slate-400 hover:text-white px-3 py-1.5 text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}

      {day.races.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-800 rounded-xl">
          <div className="text-slate-500 mb-3">No races added yet</div>
          <div className="flex gap-3 justify-center">
            <button onClick={grabLiveLines} className="text-amber-400 hover:text-amber-300 text-sm font-medium">📡 Grab Screenshots →</button>
            <span className="text-slate-600">or</span>
            <button onClick={() => setShowAddRace(true)} className="text-slate-400 hover:text-white text-sm">Add manually →</button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {day.races.map(race => {
            const rec = race.recommendation;
            const res = race.result;
            const topScore = race.scores.length > 0
              ? [...race.scores].sort((a, b) => b.totalScore - a.totalScore)[0]
              : null;
            const topHorseName = topScore
              ? (race.horses.find(h => h.id === topScore.horseEntryId)?.horseName ?? topScore.horseName)
              : null;
            return (
              <Link key={race.id} href={`/race/${race.id}`}
                className="block bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                      <span className="text-white font-bold text-sm">{race.number}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium text-sm">Race {race.number}</span>
                        <span className="text-slate-500 text-xs">
                          {race.postTime && `${race.postTime} · `}{race.distance} {race.surface} · {race.raceType.replace(/-/g, ' ')}
                        </span>
                      </div>
                      {race.horses.length > 0 && (
                        <div className="text-slate-500 text-xs mt-0.5">
                          {race.horses.filter(h => !h.scratched).length} horses
                          {topHorseName && ` · Top: ${topHorseName} (${topScore!.totalScore})`}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {rec && (
                      <span className={`px-2 py-0.5 rounded border text-xs font-semibold ${getBetBg(rec.betType as never)} ${getBetColor(rec.betType as never)}`}>
                        {getBetLabel(rec.betType as never)}
                      </span>
                    )}
                    {res ? (
                      <span className={`text-sm font-bold ${res.profitLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {res.profitLoss >= 0 ? '+' : ''}{formatCurrency(res.profitLoss)}
                      </span>
                    ) : (
                      <span className="text-slate-500 text-xs">
                        {race.horses.length === 0 ? 'Enter horses →' : 'Pending'}
                      </span>
                    )}
                    <button
                      onClick={e => deleteRace(race.id, race.number, e)}
                      className="ml-1 text-slate-600 hover:text-red-400 transition-colors text-lg leading-none"
                      title="Delete race"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {day.races.length > 0 && (
        <div className="mt-6 bg-slate-900 border border-slate-800 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Day Summary</h2>
          <div className="grid grid-cols-4 gap-3 text-center">
            <div>
              <div className="text-white font-bold">{day.races.length}</div>
              <div className="text-slate-500 text-xs">Races</div>
            </div>
            <div>
              <div className="text-white font-bold">
                {day.races.filter(r => r.recommendation && r.recommendation.betType !== 'no-bet').length}
              </div>
              <div className="text-slate-500 text-xs">Bets Rec.</div>
            </div>
            <div>
              <div className="text-white font-bold">
                {formatCurrency(day.races.reduce((s, r) => s + (r.recommendation?.totalCost ?? 0), 0))}
              </div>
              <div className="text-slate-500 text-xs">Risked</div>
            </div>
            <div>
              <div className={`font-bold ${totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {totalPnL >= 0 ? '+' : ''}{formatCurrency(totalPnL)}
              </div>
              <div className="text-slate-500 text-xs">P&L</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
