import { BankrollSettings, BetType } from './types';

export function getBetLabel(betType: BetType | string): string {
  switch (betType) {
    case 'win': return 'Win';
    case 'place': return 'Place';
    case 'show': return 'Show';
    case 'exacta-box': return 'Exacta Box';
    case 'trifecta-box': return 'Trifecta Box';
    case 'no-bet': return 'No Bet';
    default: return betType;
  }
}

export function getBetColor(betType: BetType | string): string {
  switch (betType) {
    case 'win': return 'text-emerald-400';
    case 'place': return 'text-teal-400';
    case 'show': return 'text-cyan-400';
    case 'exacta-box': return 'text-blue-400';
    case 'trifecta-box': return 'text-purple-400';
    case 'no-bet': return 'text-slate-400';
    default: return 'text-slate-400';
  }
}

export function getBetBg(betType: BetType | string): string {
  switch (betType) {
    case 'win': return 'bg-emerald-500/20 border-emerald-500/40';
    case 'place': return 'bg-teal-500/20 border-teal-500/40';
    case 'show': return 'bg-cyan-500/20 border-cyan-500/40';
    case 'exacta-box': return 'bg-blue-500/20 border-blue-500/40';
    case 'trifecta-box': return 'bg-purple-500/20 border-purple-500/40';
    case 'no-bet': return 'bg-slate-800 border-slate-700';
    default: return 'bg-slate-800 border-slate-700';
  }
}

export function getConfidenceColor(level: string): string {
  switch (level) {
    case 'high': return 'text-emerald-400';
    case 'medium': return 'text-amber-400';
    case 'low': return 'text-orange-400';
    default: return 'text-slate-500';
  }
}

export function getConfidenceBg(level: string): string {
  switch (level) {
    case 'high': return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
    case 'medium': return 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
    case 'low': return 'bg-orange-500/20 text-orange-300 border border-orange-500/30';
    default: return 'bg-slate-800 text-slate-400 border border-slate-700';
  }
}

export function checkDailyLimits(
  settings: BankrollSettings,
  dailyPnL: number,
  betsToday: number,
): { canBet: boolean; reason: string } {
  if (dailyPnL <= -settings.dailyStopLoss) {
    return { canBet: false, reason: `Daily stop-loss reached ($${Math.abs(dailyPnL).toFixed(2)} loss).` };
  }
  if (dailyPnL >= settings.dailyProfitTarget) {
    return { canBet: false, reason: `Daily profit target hit ($${dailyPnL.toFixed(2)}). Lock it in.` };
  }
  if (betsToday >= settings.maxBetsPerDay) {
    return { canBet: false, reason: `Max bets per day (${settings.maxBetsPerDay}) reached.` };
  }
  return { canBet: true, reason: '' };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}
