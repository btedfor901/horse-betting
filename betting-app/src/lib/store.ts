'use client';

import { RaceDay, Race, BankrollSettings } from './types';

const KEYS = {
  RACE_DAYS: 'cd_race_days',
  SETTINGS: 'cd_settings',
};

const DEFAULT_SETTINGS: BankrollSettings = {
  startingBankroll: 1000,
  currentBankroll: 1000,
  unitSize: 20,
  maxBetPerRace: 40,
  dailyStopLoss: 100,
  dailyProfitTarget: 150,
  maxBetsPerDay: 5,
};

export function getRaceDays(): RaceDay[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(KEYS.RACE_DAYS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function getRaceDay(id: string): RaceDay | null {
  return getRaceDays().find(rd => rd.id === id) ?? null;
}

export function saveRaceDay(raceDay: RaceDay): void {
  const days = getRaceDays();
  const idx = days.findIndex(d => d.id === raceDay.id);
  if (idx >= 0) days[idx] = raceDay;
  else days.unshift(raceDay);
  localStorage.setItem(KEYS.RACE_DAYS, JSON.stringify(days));
}

export function deleteRaceDay(id: string): void {
  const days = getRaceDays().filter(d => d.id !== id);
  localStorage.setItem(KEYS.RACE_DAYS, JSON.stringify(days));
}

export function saveRace(race: Race): void {
  const day = getRaceDay(race.raceDayId);
  if (!day) return;
  const idx = day.races.findIndex(r => r.id === race.id);
  if (idx >= 0) day.races[idx] = race;
  else day.races.push(race);
  day.races.sort((a, b) => a.number - b.number);
  saveRaceDay(day);
}

export function getSettings(): BankrollSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const data = localStorage.getItem(KEYS.SETTINGS);
    return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: BankrollSettings): void {
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

export function getTodayRaceDay(): RaceDay | null {
  const today = getTodayString();
  return getRaceDays().find(d => d.date === today) ?? null;
}

export function getDayPnL(date: string): number {
  const day = getRaceDays().find(d => d.date === date);
  if (!day) return 0;
  return day.races.reduce((sum, race) => sum + (race.result?.profitLoss ?? 0), 0);
}

export function getAllResults() {
  return getRaceDays().flatMap(day =>
    day.races
      .filter(r => r.result)
      .map(r => ({ race: r, day, result: r.result! }))
  );
}
