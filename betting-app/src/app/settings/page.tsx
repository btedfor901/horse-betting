'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/bankroll';

interface Settings {
  startingBankroll: number;
  currentBankroll: number;
  unitSize: number;
  maxBetPerRace: number;
  dailyStopLoss: number;
  dailyProfitTarget: number;
  maxBetsPerDay: number;
}

export default function SettingsPage() {
  const [form, setForm] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getSettings().then(s => setForm(s as Settings)).catch(console.error);
  }, []);

  if (!form) return null;

  function handleChange(key: keyof Settings, value: number) {
    setForm(prev => prev ? { ...prev, [key]: value } : prev);
  }

  async function handleSave() {
    if (!form) return;
    setSaving(true);
    try {
      await api.updateSettings(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  const unitFromPct = (pct: number) => Math.round(form.startingBankroll * pct / 100);

  const field = (label: string, key: keyof Settings, prefix = '$', hint?: string) => (
    <div>
      <label className="block text-sm text-slate-400 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <span className="text-slate-500 text-sm">{prefix}</span>
        <input
          type="number"
          value={form[key] as number}
          onChange={e => handleChange(key, parseFloat(e.target.value) || 0)}
          className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white w-32 focus:outline-none focus:border-amber-500"
        />
        {hint && <span className="text-slate-500 text-xs">{hint}</span>}
      </div>
    </div>
  );

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-white mb-1">Bankroll Settings</h1>
      <p className="text-slate-400 text-sm mb-6">
        Configure your starting bankroll, unit size, and daily safety limits.
      </p>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
        <div>
          <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-4">Bankroll</h2>
          <div className="grid grid-cols-2 gap-4">
            {field('Starting Bankroll', 'startingBankroll')}
            {field('Current Bankroll', 'currentBankroll')}
          </div>
        </div>

        <div className="border-t border-slate-800 pt-5">
          <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-4">Bet Sizing</h2>
          <div className="grid grid-cols-2 gap-4">
            {field('Unit Size (1 unit)', 'unitSize', '$',
              `≈ ${(form.unitSize / form.startingBankroll * 100).toFixed(1)}% of bankroll`)}
            {field('Max Bet Per Race', 'maxBetPerRace', '$',
              `${(form.maxBetPerRace / form.unitSize).toFixed(1)}× units`)}
          </div>
          <div className="mt-3 p-3 bg-slate-800 rounded-lg text-xs text-slate-400 space-y-1">
            <p>Low confidence: No bet</p>
            <p>Medium confidence: 1 unit ({formatCurrency(form.unitSize)})</p>
            <p>High confidence: 2 units ({formatCurrency(form.unitSize * 2)})</p>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-5">
          <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-4">Daily Rules</h2>
          <div className="grid grid-cols-2 gap-4">
            {field('Daily Stop-Loss', 'dailyStopLoss', '$',
              `${(form.dailyStopLoss / form.unitSize).toFixed(0)} units`)}
            {field('Daily Profit Target', 'dailyProfitTarget', '$',
              `${(form.dailyProfitTarget / form.unitSize).toFixed(0)} units`)}
          </div>
          <div className="mt-4">
            <label className="block text-sm text-slate-400 mb-1">Max Bets Per Day</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={form.maxBetsPerDay}
                onChange={e => handleChange('maxBetsPerDay', parseInt(e.target.value) || 1)}
                className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white w-20 focus:outline-none focus:border-amber-500"
              />
              <span className="text-slate-500 text-xs">races (discipline cap)</span>
            </div>
          </div>
          <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-300">
            Stop betting if down {formatCurrency(form.dailyStopLoss)} or up {formatCurrency(form.dailyProfitTarget)} for the day.
          </div>
        </div>

        <div className="border-t border-slate-800 pt-5">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Quick Sizing Reference</h2>
          <div className="grid grid-cols-3 gap-2 text-xs text-center">
            {[1, 2, 2.5, 5, 10].map(pct => (
              <div key={pct} className="bg-slate-800 rounded p-2">
                <div className="text-white font-medium">{formatCurrency(unitFromPct(pct))}</div>
                <div className="text-slate-500">{pct}% of BR</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-4 w-full bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 font-bold py-3 rounded-lg transition-colors"
      >
        {saved ? '✓ Saved' : saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
}
