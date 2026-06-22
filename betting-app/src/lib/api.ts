// Thin client-side API helpers — replace the old localStorage store
// All data now lives in PostgreSQL via the API routes.

export async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? res.statusText);
  }
  return res.json();
}

export const api = {
  // Settings
  getSettings: () => fetchJSON('/api/settings'),
  updateSettings: (data: object) =>
    fetchJSON('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),

  // Race days
  getRaceDays: () => fetchJSON('/api/race-days'),
  getRaceDay: (id: string) => fetchJSON(`/api/race-days/${id}`),
  createRaceDay: (data: { date: string; track?: string }) =>
    fetchJSON('/api/race-days', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),

  // Races
  createRace: (data: object) =>
    fetchJSON('/api/races', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  getRace: (id: string) => fetchJSON(`/api/races/${id}`),
  updateHorses: (raceId: string, horses: object[]) =>
    fetchJSON(`/api/races/${raceId}/horses`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(horses) }),
  analyzeRace: (raceId: string) =>
    fetchJSON(`/api/races/${raceId}/analyze`, { method: 'POST' }),
  saveResults: (raceId: string, data: object) =>
    fetchJSON(`/api/races/${raceId}/results`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
};
