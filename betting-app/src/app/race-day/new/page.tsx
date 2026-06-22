'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { TRACKS } from '@/lib/tracks';

type CaptureStatus = 'idle' | 'running' | 'done' | 'error';

export default function NewRaceDayPage() {
  const router = useRouter();
  const today = new Date().toLocaleDateString('en-CA');

  const [date, setDate] = useState(today);
  const [selectedTracks, setSelectedTracks] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [captureStatus, setCaptureStatus] = useState<CaptureStatus>('idle');
  const [captureMsg, setCaptureMsg] = useState('');

  const formatted = new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  function toggleTrack(name: string) {
    setSelectedTracks(prev =>
      prev.includes(name) ? prev.filter(t => t !== name) : [...prev, name]
    );
  }

  async function handleCreate() {
    if (selectedTracks.length === 0) return;
    setCreating(true);
    try {
      // Create a race day record for each selected track
      const promises = selectedTracks.map(track => api.createRaceDay({ date, track }));
      const days = await Promise.all(promises);
      // Navigate to the first created race day
      router.push(`/race-day/${(days[0] as { id: string }).id}`);
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  }

  async function handleGrabScreenshots() {
    if (selectedTracks.length === 0) {
      setCaptureMsg('Select at least one track first.');
      setCaptureStatus('error');
      return;
    }
    setCaptureStatus('running');
    setCaptureMsg('Starting browser — this will take a few minutes...');
    try {
      const res = await fetch('/api/capture-screenshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tracks: selectedTracks, date }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCaptureStatus('done');
      setCaptureMsg(`Started! Screenshots will appear in public/screenshots/${date}/ when done.`);
    } catch (e) {
      setCaptureStatus('error');
      setCaptureMsg(String(e));
    }
  }

  async function handleLiveLines() {
    if (selectedTracks.length === 0) {
      setCaptureMsg('Select at least one track first.');
      setCaptureStatus('error');
      return;
    }
    setCaptureStatus('running');
    setCaptureMsg('Grabbing live lines...');
    try {
      const res = await fetch('/api/capture-screenshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tracks: selectedTracks, date, liveOnly: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCaptureStatus('done');
      setCaptureMsg('Live lines capture started!');
    } catch (e) {
      setCaptureStatus('error');
      setCaptureMsg(String(e));
    }
  }

  const statusColors: Record<CaptureStatus, string> = {
    idle: '',
    running: 'text-amber-400',
    done: 'text-emerald-400',
    error: 'text-red-400',
  };

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-white">New Race Day</h1>
        <p className="text-slate-400 text-sm mt-1">Select tracks and date to set up your card.</p>
      </div>

      {/* Date */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div>
          <label className="block text-sm text-slate-400 mb-2">Race Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500 text-base"
          />
          <p className="text-slate-500 text-xs mt-1.5">{formatted}</p>
        </div>

        {/* Track selector */}
        <div>
          <label className="block text-sm text-slate-400 mb-2">Tracks</label>
          <div className="space-y-2">
            {TRACKS.map(track => {
              const selected = selectedTracks.includes(track.name);
              return (
                <button
                  key={track.name}
                  type="button"
                  onClick={() => toggleTrack(track.name)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border text-left transition-colors ${
                    selected
                      ? 'bg-amber-500/15 border-amber-500/50 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <div>
                    <div className="font-medium text-sm">{track.name}</div>
                    <div className="text-xs text-slate-500">{track.location} · {track.twinSpiresType}</div>
                  </div>
                  <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                    selected ? 'bg-amber-500 border-amber-500' : 'border-slate-600'
                  }`}>
                    {selected && (
                      <svg className="w-3 h-3 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Screenshot capture */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
        <div>
          <div className="text-white font-semibold text-sm mb-0.5">TwinSpires Screenshots</div>
          <div className="text-slate-500 text-xs">Automatically captures Advanced, Speed, Class, Pace & Tips for every race.</div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleGrabScreenshots}
            disabled={captureStatus === 'running' || selectedTracks.length === 0}
            className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-3 rounded-lg text-sm transition-colors"
          >
            {captureStatus === 'running' ? 'Running...' : '📸 Grab Screenshots'}
          </button>
          <button
            type="button"
            onClick={handleLiveLines}
            disabled={captureStatus === 'running' || selectedTracks.length === 0}
            className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-white font-semibold py-3 rounded-lg text-sm transition-colors"
          >
            📡 Live Lines
          </button>
        </div>

        {captureMsg && (
          <p className={`text-xs ${statusColors[captureStatus]}`}>{captureMsg}</p>
        )}
      </div>

      {/* Create race day button */}
      <button
        onClick={handleCreate}
        disabled={creating || selectedTracks.length === 0}
        className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 font-bold py-4 rounded-xl text-base transition-colors"
      >
        {creating ? 'Creating...' : `Create Race Day →`}
      </button>

      {selectedTracks.length === 0 && (
        <p className="text-center text-slate-500 text-xs">Select at least one track to continue</p>
      )}
    </div>
  );
}
