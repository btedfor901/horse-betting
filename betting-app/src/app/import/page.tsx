'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type ImportStatus = 'idle' | 'loading' | 'success' | 'error';

interface ImportedRace {
  id: string;
  number: number;
  horsesImported: number;
}

interface ImportResponse {
  success: boolean;
  raceDayId?: string;
  source?: string;
  racesImported?: number;
  races?: ImportedRace[];
  error?: string;
}

export default function ImportPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [source, setSource] = useState<'csv' | 'equibase'>('csv');
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState('');
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [error, setError] = useState('');

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = ev => setCsvText(ev.target?.result as string ?? '');
    reader.readAsText(file);
  }

  async function handleImport() {
    setStatus('loading');
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, date, track: 'Churchill Downs', csvText }),
      });

      const data: ImportResponse = await res.json();

      if (!res.ok || !data.success) {
        setStatus('error');
        setError(data.error ?? 'Import failed');
        return;
      }

      setStatus('success');
      setResult(data);
    } catch (e) {
      setStatus('error');
      setError(String(e));
    }
  }

  async function downloadTemplate() {
    const res = await fetch('/api/import');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cd-picks-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Import Racecard</h1>
        <p className="text-slate-400 text-sm mt-1">
          Load race data from a CSV file or live provider. Fields not in the import can be edited after.
        </p>
      </div>

      <div className="space-y-4">

        {/* Source + Date */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-4">1. Select Date & Source</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Race Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Data Source</label>
              <select
                value={source}
                onChange={e => setSource(e.target.value as 'csv' | 'equibase')}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
              >
                <option value="csv">CSV Upload (BRIS / any source)</option>
                <option value="equibase">Equibase Public Pages ⚠</option>
              </select>
            </div>
          </div>

          {source === 'equibase' && (
            <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-300 space-y-1">
              <p className="font-semibold">⚠ Equibase provider status</p>
              <p>Only fetches public (non-premium) pages. Gives you horse name, post position, jockey, trainer, morning line odds, and race conditions.</p>
              <p>Does NOT provide speed figures, class ratings, or pace data — add those manually after import.</p>
              <p>If parsing fails, the system will tell you and recommend CSV upload instead.</p>
            </div>
          )}
        </div>

        {/* CSV Upload */}
        {source === 'csv' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wider">2. Upload CSV</h2>
              <button
                onClick={downloadTemplate}
                className="text-xs text-amber-400 hover:text-amber-300 border border-amber-500/30 px-2 py-1 rounded transition-colors"
              >
                Download template ↓
              </button>
            </div>

            <div
              className="border-2 border-dashed border-slate-700 hover:border-amber-500/40 rounded-lg p-6 text-center cursor-pointer transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />
              {fileName ? (
                <div>
                  <div className="text-emerald-400 font-medium text-sm">{fileName}</div>
                  <div className="text-slate-500 text-xs mt-1">Click to replace</div>
                </div>
              ) : (
                <div>
                  <div className="text-slate-400 text-sm">Click to upload CSV</div>
                  <div className="text-slate-600 text-xs mt-1">.csv or .txt file</div>
                </div>
              )}
            </div>

            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-slate-400">Or paste CSV text directly</label>
                {csvText && (
                  <button onClick={() => { setCsvText(''); setFileName(''); }} className="text-xs text-slate-500 hover:text-white">
                    Clear
                  </button>
                )}
              </div>
              <textarea
                value={csvText}
                onChange={e => { setCsvText(e.target.value); setFileName(''); }}
                placeholder={`raceNumber,postPosition,horseName,morningLineOdds,...\n1,5,Cozy Curlin Kitten,8/5,...`}
                rows={6}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-amber-500 resize-y"
              />
            </div>

            <div className="mt-3 p-3 bg-slate-800 rounded-lg">
              <div className="text-xs font-semibold text-slate-400 mb-2">How to fill the template from BRIS:</div>
              <ol className="text-xs text-slate-500 space-y-0.5 list-decimal list-inside">
                <li>Open your BRIS program page (Summary view)</li>
                <li>Copy horse data into the CSV template — one row per horse</li>
                <li>Set raceNumber (same number for all horses in a race)</li>
                <li>Include distance/surface/raceType on the first horse row of each race</li>
                <li>Upload and the system imports all races at once</li>
              </ol>
            </div>
          </div>
        )}

        {/* Import button */}
        <button
          onClick={handleImport}
          disabled={status === 'loading' || (source === 'csv' && !csvText.trim())}
          className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 font-bold py-3 rounded-lg transition-colors"
        >
          {status === 'loading' ? 'Importing...' : `Import from ${source === 'csv' ? 'CSV' : 'Equibase'} →`}
        </button>

        {/* Error state */}
        {status === 'error' && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <div className="text-red-400 font-semibold text-sm mb-1">Import failed</div>
            <div className="text-red-300 text-xs whitespace-pre-wrap">{error}</div>
            {error.includes('Equibase') && (
              <div className="mt-3 pt-3 border-t border-red-500/20">
                <div className="text-amber-400 text-xs font-semibold mb-1">Recommendation:</div>
                <div className="text-slate-400 text-xs">Use CSV upload instead. Download the template, fill it in from your BRIS program, and re-import.</div>
                <button onClick={downloadTemplate} className="mt-2 text-xs text-amber-400 hover:text-amber-300">
                  Download template →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Success state */}
        {status === 'success' && result && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
            <div className="text-emerald-400 font-semibold text-sm mb-2">
              ✓ {result.racesImported} race{result.racesImported !== 1 ? 's' : ''} imported from {result.source}
            </div>

            {result.races && result.races.length > 0 && (
              <div className="space-y-1 mb-3">
                {result.races.map(r => (
                  <div key={r.id} className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">Race {r.number}</span>
                    <span className="text-slate-500">{r.horsesImported} horses</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => result.raceDayId && router.push(`/race-day/${result.raceDayId}`)}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold py-2 rounded text-sm transition-colors"
              >
                View Race Day →
              </button>
              <button
                onClick={() => { setStatus('idle'); setResult(null); setCsvText(''); setFileName(''); }}
                className="px-4 py-2 text-slate-400 hover:text-white text-sm"
              >
                Import More
              </button>
            </div>

            <div className="mt-3 pt-3 border-t border-emerald-500/20 text-xs text-slate-400">
              Next: open each race → click <strong className="text-white">Analyze Race</strong> to score horses and get a bet recommendation.
              Add any missing BRIS data (speed figures, pace) to each horse before analyzing.
            </div>
          </div>
        )}

        {/* Info box */}
        {status === 'idle' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs text-slate-500 space-y-2">
            <div className="font-semibold text-slate-400">What happens after import:</div>
            <div>1. Races and horses are saved to the database.</div>
            <div>2. You can edit any horse entry (add missing BRIS figures) from the race page.</div>
            <div>3. Click <span className="text-white">Analyze</span> on the race to run the scoring model and get a recommendation.</div>
            <div>4. After the race, enter results to track ROI.</div>
          </div>
        )}
      </div>
    </div>
  );
}
