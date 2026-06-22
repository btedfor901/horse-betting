'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { getBetLabel, getBetBg, getBetColor, getConfidenceBg, formatCurrency, formatPct } from '@/lib/bankroll';
import { HorseScore, BetRecommendation } from '@/lib/types';

// Mirrors Prisma HorseEntry (client-side editable version)
interface LocalHorse {
  _key: string; // React key (temp or db id)
  id?: string;  // DB id if already saved
  horseName: string;
  postPosition: number;
  morningLineOdds: string;
  currentOdds: string;
  jockeyName: string;
  jockeyWinPct: number | null;
  trainerName: string;
  trainerWinPct: number | null;
  runStyle: string;
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
}

interface DbScore {
  horseEntryId: string; totalScore: number; rank: number; speedScore: number;
  classScore: number; formScore: number; paceScore: number; jockeyScore: number;
  trainerScore: number; postScore: number; valueScore: number;
  modelProbability: number; impliedProbability: number; valueRating: number;
}

interface ApiRec {
  betType: string; horses: string; horseIds: string; totalCost: number;
  costPerCombination: number; confidence: string; reasoning: string; scoreLead: number;
}

interface ApiRace {
  id: string; raceDayId: string; number: number; distance: string; surface: string;
  raceType: string; postTime?: string; purse?: string; conditions?: string;
  horses: (LocalHorse & { id: string })[];
  scores: DbScore[];
  recommendation?: ApiRec;
  result?: { profitLoss: number; winner: string; orderOfFinish: string; betPlaced: string; };
}

function blank(n: number): LocalHorse {
  return {
    _key: crypto.randomUUID(), horseName: '', postPosition: n,
    morningLineOdds: '', currentOdds: '', jockeyName: '', jockeyWinPct: null,
    trainerName: '', trainerWinPct: null, runStyle: '', daysOff: null,
    avgSpeed: null, bestSpeed: null, backSpeed: null, speedLR: null,
    primePower: null, avgClass: null, lastClass: null, earlyPace1: null,
    earlyPace2: null, latePace: null, avgDistance: null, angles: '', scratched: false,
  };
}

const n = (v: string) => (v === '' ? null : parseFloat(v));

function HorseRow({
  horse, score, onUpdate, onRemove, expanded, onToggle,
}: {
  horse: LocalHorse;
  score: (HorseScore & { horseName: string }) | null;
  onUpdate: (h: LocalHorse) => void;
  onRemove: () => void;
  expanded: boolean;
  onToggle: () => void;
}) {
  const set = (key: keyof LocalHorse, val: unknown) => onUpdate({ ...horse, [key]: val });

  const inp = (label: string, key: keyof LocalHorse, type: 'number' | 'text' = 'number', placeholder = '') => (
    <div>
      <label className="text-xs text-slate-500 block mb-0.5">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={(horse[key] as number | string | null) ?? ''}
        onChange={e => set(key, type === 'number' ? n(e.target.value) : e.target.value)}
        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-amber-500"
      />
    </div>
  );

  const scoreColor = score
    ? score.totalScore >= 75 ? 'text-emerald-400'
    : score.totalScore >= 60 ? 'text-amber-400' : 'text-slate-400'
    : 'text-slate-600';

  return (
    <div className={`bg-slate-900 border rounded-xl overflow-hidden transition-all ${horse.scratched ? 'opacity-50 border-slate-800' : 'border-slate-800 hover:border-slate-700'}`}>
      <div className="flex items-center">
        {/* Clickable toggle — everything except the live odds input */}
        <button className="flex-1 flex items-center gap-3 p-3 text-left min-w-0" onClick={onToggle}>
          <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">{horse.postPosition || '?'}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-white font-medium text-sm truncate">
                {horse.horseName || <span className="text-slate-500">Unnamed horse</span>}
              </span>
              {horse.scratched && (
                <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 rounded">SCR</span>
              )}
              {horse.angles && (
                <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 rounded truncate max-w-32 hidden sm:block">
                  {horse.angles.split(',')[0].trim()}
                </span>
              )}
            </div>
            <div className="text-slate-500 text-xs mt-0.5">
              {horse.jockeyName && horse.jockeyName}
              {horse.trainerName && ` / ${horse.trainerName}`}
              {horse.morningLineOdds && ` · ML ${horse.morningLineOdds}`}
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {score && !horse.scratched && (
              <div className="text-right">
                <div className={`text-sm font-bold ${scoreColor}`}>{score.totalScore}</div>
                {score.rank <= 3 && <div className="text-xs text-slate-500">#{score.rank}</div>}
              </div>
            )}
            <span className="text-slate-600 text-xs">{expanded ? '▲' : '▼'}</span>
          </div>
        </button>

        {/* Live odds — always visible, click won't expand the row */}
        {!horse.scratched && (
          <div className="px-3 py-2 border-l border-slate-800 shrink-0 flex flex-col items-center gap-0.5">
            <span className="text-xs text-slate-500">Live</span>
            <input
              type="text"
              placeholder={horse.morningLineOdds || 'odds'}
              value={horse.currentOdds ?? ''}
              onChange={e => onUpdate({ ...horse, currentOdds: e.target.value })}
              onClick={e => e.stopPropagation()}
              className="w-14 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-amber-300 text-xs text-center font-medium focus:outline-none focus:border-amber-500 focus:bg-slate-900 placeholder:text-slate-600"
            />
          </div>
        )}
      </div>

      {expanded && (
        <div className="border-t border-slate-800 p-4 space-y-4">
          <div>
            <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">Horse Info</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="col-span-2">{inp('Name', 'horseName', 'text', 'Horse Name')}</div>
              {inp('Post #', 'postPosition')}
              <div>
                <label className="text-xs text-slate-500 block mb-0.5">Run Style</label>
                <select value={horse.runStyle} onChange={e => set('runStyle', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-amber-500">
                  <option value="">Unknown</option>
                  <option value="E">E — Early</option>
                  <option value="P">P — Presser</option>
                  <option value="S">S — Stalker</option>
                  <option value="C">C — Closer</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">Odds</div>
            <div className="grid grid-cols-3 gap-2">
              {inp('Morning Line', 'morningLineOdds', 'text', '8/5')}
              {inp('Current Odds', 'currentOdds', 'text', '7/2')}
              {inp('Days Off', 'daysOff')}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">Speed Figures</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {inp('Best Speed', 'bestSpeed')}
              {inp('Back Speed', 'backSpeed')}
              {inp('Speed LR', 'speedLR')}
              {inp('Avg Speed', 'avgSpeed')}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">Class</div>
            <div className="grid grid-cols-3 gap-2">
              {inp('Prime Power', 'primePower')}
              {inp('Avg Class', 'avgClass')}
              {inp('Last Class', 'lastClass')}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">Pace Figures</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {inp('Early Pace 1', 'earlyPace1')}
              {inp('Early Pace 2', 'earlyPace2')}
              {inp('Late Pace', 'latePace')}
              {inp('Avg@Distance', 'avgDistance')}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">Jockey / Trainer</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="col-span-1">{inp('Jockey Name', 'jockeyName', 'text', 'Last, First')}</div>
              {inp('Jockey Win%', 'jockeyWinPct')}
              <div className="col-span-1">{inp('Trainer Name', 'trainerName', 'text', 'Last, First')}</div>
              {inp('Trainer Win%', 'trainerWinPct')}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">Angles / Notes</div>
            <input type="text"
              placeholder="Horse for Course, Key Trainer, Clocker Special..."
              value={horse.angles}
              onChange={e => set('angles', e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-amber-500" />
          </div>

          {score && !horse.scratched && (
            <div className="bg-slate-950 rounded-lg p-3">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Score Breakdown</div>
              <div className="space-y-1.5">
                {([
                  ['Speed', score.speedScore, 25],
                  ['Class', score.classScore, 20],
                  ['Form', score.formScore, 15],
                  ['Pace', score.paceScore, 10],
                  ['Jockey', score.jockeyScore, 10],
                  ['Trainer', score.trainerScore, 10],
                  ['Post', score.postScore, 5],
                  ['Value', score.valueScore, 5],
                ] as const).map(([label, val, max]) => (
                  <div key={label} className="flex items-center gap-2">
                    <div className="text-slate-500 text-xs w-12 shrink-0">{label}</div>
                    <div className="flex-1 bg-slate-800 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-amber-500" style={{ width: `${(val / max) * 100}%` }} />
                    </div>
                    <div className="text-white text-xs w-8 text-right">{val}/{max}</div>
                  </div>
                ))}
                <div className="border-t border-slate-800 pt-2 flex justify-between">
                  <span className="text-slate-400 text-xs">Total</span>
                  <span className={`text-sm font-bold ${scoreColor}`}>{score.totalScore}/100</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 text-xs">Model Prob</span>
                  <span className="text-white text-xs">{formatPct(score.modelProbability)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 text-xs">Implied Prob (odds)</span>
                  <span className="text-white text-xs">{formatPct(score.impliedProbability)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 text-xs">Value Rating</span>
                  <span className={`text-xs font-medium ${score.valueRating >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {score.valueRating >= 0 ? '+' : ''}{formatPct(score.valueRating)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={horse.scratched}
                onChange={e => set('scratched', e.target.checked)} className="accent-red-500" />
              <span className="text-xs text-slate-400">Scratched</span>
            </label>
            <button onClick={onRemove} className="ml-auto text-xs text-red-400 hover:text-red-300 transition-colors">
              Remove horse
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const SCREENSHOT_TABS = [
  { key: 'advanced', label: 'ADV' },
  { key: 'speed',    label: 'SPD' },
  { key: 'class',    label: 'CLS' },
  { key: 'pace',     label: 'PCE' },
  { key: 'tips',     label: 'TPS' },
  { key: 'summary',  label: 'SUM' },
];

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function ScreenshotPanel({ date, track, raceNum }: { date: string; track: string; raceNum: number }) {
  const [tab, setTab] = useState('advanced');
  const [open, setOpen] = useState(true);
  const [imgError, setImgError] = useState(false);

  const base = process.env.NEXT_PUBLIC_SCREENSHOTS_BASE_URL ?? '';
  const relPath = `screenshots/${date}/${slugify(track)}/race-${raceNum}/${tab}.png`;
  const src = base ? `${base}/${relPath}` : `/${relPath}`;

  // Reset error when tab changes
  const handleTabChange = (key: string) => { setTab(key); setImgError(false); };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mb-5">
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-300">TwinSpires — Race {raceNum}</span>
          <span className="text-xs text-slate-500">{track}</span>
        </div>
        <span className="text-slate-500 text-xs">{open ? '▲ hide' : '▼ show'}</span>
      </button>

      {open && (
        <>
          {/* Tab switcher */}
          <div className="flex border-t border-slate-800">
            {SCREENSHOT_TABS.map(t => (
              <button
                key={t.key}
                onClick={() => handleTabChange(t.key)}
                className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                  tab === t.key
                    ? 'bg-amber-500 text-slate-900'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Screenshot */}
          <div className="bg-slate-950">
            {imgError ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-600 text-sm">
                <span className="text-2xl mb-2">📷</span>
                <span>No screenshot yet for {tab}</span>
                <span className="text-xs mt-1 text-slate-700">{src}</span>
              </div>
            ) : (
              <img
                key={src}
                src={src}
                alt={`Race ${raceNum} ${tab}`}
                onError={() => setImgError(true)}
                className="w-full h-auto block"
                style={{ maxHeight: '70vh', objectFit: 'contain', objectPosition: 'top' }}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function RacePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [race, setRace] = useState<ApiRace | null>(null);
  const [raceDay, setRaceDay] = useState<{ date: string; track: string } | null>(null);
  const [horses, setHorses] = useState<LocalHorse[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [scores, setScores] = useState<HorseScore[]>([]);
  const [rec, setRec] = useState<BetRecommendation | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [trackCondition, setTrackCondition] = useState<'fast'|'good'|'yielding'|'muddy'|'sloppy'|'heavy'>('fast');

  useEffect(() => {
    api.getRace(id)
      .then(r => {
        const race = r as ApiRace;
        setRace(race);
        // Fetch race day for date + track (needed for screenshot paths)
        api.getRaceDay(race.raceDayId)
          .then(d => setRaceDay(d as { date: string; track: string }))
          .catch(() => {});
        const localHorses: LocalHorse[] = race.horses.map(h => ({
          ...h, _key: h.id,
        }));
        setHorses(localHorses);
        if (localHorses.length === 0) setExpanded('__add');

        // Adapt DB scores → HorseScore shape (add horseName by joining with horses)
        if (race.scores.length > 0) {
          const adapted: HorseScore[] = race.scores.map(s => {
            const h = race.horses.find(hh => hh.id === s.horseEntryId);
            return {
              horseId: s.horseEntryId,
              horseName: h?.horseName ?? '',
              speedScore: s.speedScore,
              classScore: s.classScore,
              formScore: s.formScore,
              paceScore: s.paceScore,
              jockeyScore: s.jockeyScore,
              trainerScore: s.trainerScore,
              postScore: s.postScore,
              valueScore: s.valueScore,
              totalScore: s.totalScore,
              rank: s.rank,
              confidence: 'medium' as const, // not stored in DB score row
              modelProbability: s.modelProbability,
              impliedProbability: s.impliedProbability,
              valueRating: s.valueRating,
            };
          });
          setScores(adapted);
        }

        if (race.recommendation) {
          const r = race.recommendation;
          setRec({
            betType: r.betType as BetRecommendation['betType'],
            amount: r.totalCost,
            costPerCombination: r.costPerCombination,
            totalCost: r.totalCost,
            horses: JSON.parse(r.horses || '[]'),
            horseIds: JSON.parse(r.horseIds || '[]'),
            confidence: r.confidence as BetRecommendation['confidence'],
            reasoning: r.reasoning,
            scoreLead: r.scoreLead,
          });
        }
      })
      .catch(() => router.push('/'));
  }, [id, router]);

  function addHorse() {
    const h = blank(horses.length + 1);
    setHorses(prev => [...prev, h]);
    setExpanded(h._key);
  }

  function updateHorse(updated: LocalHorse) {
    setHorses(prev => prev.map(h => h._key === updated._key ? updated : h));
  }

  function removeHorse(key: string) {
    setHorses(prev => prev.filter(h => h._key !== key));
  }

  async function saveAndAnalyze() {
    if (!race) return;
    if (horses.length === 0) { setError('Add at least one horse first.'); return; }
    setSaving(true);
    setError('');
    try {
      // PUT horses (route extracts only what it needs, ignores _key/id)
      const newHorses = await api.updateHorses(race.id, horses) as (LocalHorse & { id: string })[];

      // Update local state with DB-assigned IDs
      setHorses(newHorses.map(h => ({ ...h, _key: h.id })));

      // POST analyze
      const analysis = await api.analyzeRace(race.id, trackCondition) as { scores: HorseScore[]; recommendation: BetRecommendation };
      setScores(analysis.scores);
      setRec(analysis.recommendation);

      // Update race to reflect it has a recommendation now (for results link)
      setRace(prev => prev ? {
        ...prev,
        horses: newHorses,
        recommendation: {
          betType: analysis.recommendation.betType,
          horses: JSON.stringify(analysis.recommendation.horses),
          horseIds: JSON.stringify(analysis.recommendation.horseIds),
          totalCost: analysis.recommendation.totalCost,
          costPerCombination: analysis.recommendation.costPerCombination,
          confidence: analysis.recommendation.confidence,
          reasoning: analysis.recommendation.reasoning,
          scoreLead: analysis.recommendation.scoreLead,
        },
      } : prev);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  if (!race) return <div className="text-slate-400 text-sm">Loading...</div>;

  const activeHorses = horses.filter(h => !h.scratched);
  const sortedScores = [...scores]
    .filter(s => !horses.find(h => (h.id ?? h._key) === s.horseId)?.scratched)
    .sort((a, b) => b.totalScore - a.totalScore);

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <Link href={`/race-day/${race.raceDayId}`} className="text-slate-500 hover:text-white text-sm">
          ← Race Day
        </Link>
        <span className="text-slate-700">/</span>
        <span className="text-white font-semibold">
          Race {race.number}
          <span className="text-slate-400 font-normal ml-2 text-sm">
            {race.distance} · {race.surface} · {race.raceType.replace(/-/g, ' ')}
            {race.postTime && ` · ${race.postTime}`}
            {race.purse && ` · ${race.purse}`}
          </span>
        </span>
      </div>

      {raceDay && (
        <ScreenshotPanel date={raceDay.date} track={raceDay.track} raceNum={race.number} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Horse list */}
        <div className="lg:col-span-2 space-y-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-300">
              Horses ({activeHorses.length} active
              {horses.filter(h => h.scratched).length > 0 && `, ${horses.filter(h => h.scratched).length} scratched`})
            </h2>
            <button onClick={addHorse}
              className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 px-3 py-1 rounded text-xs font-medium transition-colors">
              + Add Horse
            </button>
          </div>

          {horses.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-800 rounded-xl">
              <div className="text-slate-500 text-sm mb-2">No horses entered yet</div>
              <button onClick={addHorse} className="text-amber-400 hover:text-amber-300 text-sm">Add first horse →</button>
            </div>
          ) : (
            horses.map(horse => {
              const score = scores.find(s => s.horseId === (horse.id ?? horse._key));
              return (
                <HorseRow
                  key={horse._key}
                  horse={horse}
                  score={score as (HorseScore & { horseName: string }) | null ?? null}
                  onUpdate={updateHorse}
                  onRemove={() => removeHorse(horse._key)}
                  expanded={expanded === horse._key}
                  onToggle={() => setExpanded(expanded === horse._key ? null : horse._key)}
                />
              );
            })
          )}

          {horses.length > 0 && (
            <div className="mt-4 space-y-3">
              {/* Track condition */}
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
                <label className="text-xs font-semibold text-amber-400 uppercase tracking-wider block mb-2">Track Condition</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['fast','good','yielding','muddy','sloppy','heavy'] as const).map(c => {
                    const isOff = c === 'muddy' || c === 'sloppy' || c === 'heavy' || c === 'yielding';
                    return (
                      <button key={c} onClick={() => setTrackCondition(c)}
                        className={`py-1.5 rounded text-xs font-semibold capitalize transition-colors ${
                          trackCondition === c
                            ? isOff ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}>
                        {c}
                      </button>
                    );
                  })}
                </div>
                {(trackCondition === 'muddy' || trackCondition === 'sloppy' || trackCondition === 'heavy' || trackCondition === 'yielding') && (
                  <p className="text-xs text-blue-400 mt-2">Off-track adjustments active — closers boosted, speed horses penalized</p>
                )}
              </div>
              {error && <div className="text-red-400 text-xs">{error}</div>}
              <button onClick={saveAndAnalyze} disabled={saving}
                className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 font-bold py-2.5 rounded-lg text-sm transition-colors">
                {saving ? 'Saving & Analyzing...' : 'Save & Analyze Race →'}
              </button>
              <p className="text-slate-600 text-xs text-center">Saves all horse data and runs the scoring model</p>
            </div>
          )}
        </div>

        {/* Scores + Recommendation panel */}
        <div className="space-y-4">
          {sortedScores.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <h2 className="text-sm font-semibold text-slate-300 mb-3">Field Rankings</h2>
              <div className="space-y-2">
                {sortedScores.map((s, i) => (
                  <div key={s.horseId} className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      i === 0 ? 'bg-amber-500 text-slate-900' :
                      i === 1 ? 'bg-slate-600 text-white' :
                      i === 2 ? 'bg-amber-900 text-amber-300' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-xs font-medium truncate">{s.horseName}</div>
                      <div className="bg-slate-800 rounded-full h-1 mt-1">
                        <div className="h-1 rounded-full bg-amber-500" style={{ width: `${s.totalScore}%` }} />
                      </div>
                    </div>
                    <div className={`text-xs font-bold shrink-0 ${
                      s.totalScore >= 75 ? 'text-emerald-400' :
                      s.totalScore >= 60 ? 'text-amber-400' : 'text-slate-400'
                    }`}>
                      {s.totalScore}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {rec && (
            <div className={`border rounded-xl p-4 ${getBetBg(rec.betType)}`}>
              <div className="flex items-center justify-between mb-2">
                <div className={`text-sm font-bold ${getBetColor(rec.betType)}`}>
                  {getBetLabel(rec.betType)}
                </div>
                {rec.betType !== 'no-bet' && (
                  <span className={`text-xs px-2 py-0.5 rounded ${getConfidenceBg(rec.confidence)}`}>
                    {rec.confidence}
                  </span>
                )}
              </div>
              {rec.betType !== 'no-bet' && rec.horses.length > 0 && (
                <div className="mb-2">
                  <div className="text-white font-semibold text-sm">{rec.horses.join(' / ')}</div>
                  <div className="text-slate-300 text-xs mt-0.5">
                    ${rec.totalCost.toFixed(2)} total
                    {rec.betType !== 'win' && ` ($${rec.costPerCombination}/combo)`}
                  </div>
                </div>
              )}
              <p className="text-slate-300 text-xs leading-relaxed">{rec.reasoning}</p>
            </div>
          )}

          {race.recommendation && (
            <Link href={`/results/${race.id}`}
              className="block bg-slate-900 border border-slate-700 hover:border-amber-500/40 rounded-xl p-4 text-center transition-colors">
              <div className="text-amber-400 text-sm font-medium">Enter Results →</div>
              <div className="text-slate-500 text-xs mt-0.5">Record finish order and bet outcome</div>
            </Link>
          )}

          {race.result && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-sm font-semibold text-slate-300 mb-2">Result</div>
              <div className="text-white font-bold">{race.result.winner}</div>
              <div className={`text-lg font-bold mt-2 ${race.result.profitLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {race.result.profitLoss >= 0 ? '+' : ''}{formatCurrency(race.result.profitLoss)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

