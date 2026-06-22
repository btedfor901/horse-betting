// CSV Provider
// Parses uploaded CSV files matching the BRIS Summary export format.
// This is the primary legal data source — you paste or export from BRIS,
// upload the file, and the system populates every race automatically.
//
// CSV columns (all optional except horseName, postPosition, raceNumber):
//   raceNumber, postPosition, horseName, morningLineOdds, currentOdds,
//   runStyle, daysOff, jockeyName, jockeyWinPct, trainerName, trainerWinPct,
//   bestSpeed, backSpeed, speedLR, avgSpeed, primePower, avgClass, lastClass,
//   earlyPace1, earlyPace2, latePace, avgDistance, angles, scratched,
//   distance, surface, raceType, postTime, purse, conditions

import {
  DataProvider,
  ImportResult,
  NormalizedRace,
  NormalizedHorse,
  NormalizedRacecard,
} from './types';

function parseNum(val: string | undefined): number | undefined {
  if (!val || val.trim() === '' || val.trim() === '-') return undefined;
  const n = parseFloat(val.trim());
  return isNaN(n) ? undefined : n;
}

function parseBool(val: string | undefined): boolean {
  return val?.trim().toLowerCase() === 'true' || val?.trim() === '1';
}

function parseStr(val: string | undefined): string | undefined {
  const s = val?.trim();
  return s && s !== '-' ? s : undefined;
}

export function parseCSV(csvText: string, date: string): ImportResult {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) {
    return { success: false, source: 'csv', error: 'CSV must have a header row and at least one data row.' };
  }

  const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, ''));
  const rows = lines.slice(1).map(line => {
    // Handle quoted fields
    const fields: string[] = [];
    let inQuote = false;
    let current = '';
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === ',' && !inQuote) { fields.push(current); current = ''; }
      else { current += ch; }
    }
    fields.push(current);
    return Object.fromEntries(header.map((h, i) => [h, fields[i] ?? '']));
  });

  // Group rows by raceNumber
  const raceMap = new Map<number, { meta: Record<string, string>; horses: NormalizedHorse[] }>();

  for (const row of rows) {
    const raceNum = parseInt(row['racenumber'] || row['race'] || '0');
    if (!raceNum) continue;

    if (!raceMap.has(raceNum)) {
      raceMap.set(raceNum, { meta: row, horses: [] });
    }

    const entry = raceMap.get(raceNum)!;
    const horse: NormalizedHorse = {
      programNumber: parseStr(row['programnumber'] || row['program']),
      postPosition: parseInt(row['postposition'] || row['post'] || '0'),
      horseName: parseStr(row['horsename'] || row['horse'] || '') ?? 'Unknown',
      morningLineOdds: parseStr(row['morninglineodds'] || row['ml'] || row['morningline']),
      currentOdds: parseStr(row['currentodds'] || row['odds']),
      jockeyName: parseStr(row['jockeyname'] || row['jockey']),
      jockeyWinPct: parseNum(row['jockeywinstpct'] || row['jockeywpct'] || row['jkey%']),
      trainerName: parseStr(row['trainername'] || row['trainer']),
      trainerWinPct: parseNum(row['trainerwinstpct'] || row['trainerwpct'] || row['trnr%']),
      owner: parseStr(row['owner']),
      weight: parseNum(row['weight']) ? parseInt(row['weight']) : undefined,
      medication: parseStr(row['medication'] || row['med']),
      equipment: parseStr(row['equipment'] || row['equip']),
      runStyle: parseStr(row['runstyle'] || row['style']),
      daysOff: parseNum(row['daysoff'] || row['days']),
      avgSpeed: parseNum(row['avgspeed'] || row['avgspdspd']),
      bestSpeed: parseNum(row['bestspeed'] || row['bestspd']),
      backSpeed: parseNum(row['backspeed'] || row['backspd']),
      speedLR: parseNum(row['speedlr'] || row['spdlr'] || row['spd_lr']),
      primePower: parseNum(row['primepower'] || row['primepwr'] || row['prmpwr']),
      avgClass: parseNum(row['avgclass'] || row['avgcls']),
      lastClass: parseNum(row['lastclass'] || row['lastcls']),
      earlyPace1: parseNum(row['earlypace1'] || row['ep1']),
      earlyPace2: parseNum(row['earlypace2'] || row['ep2']),
      latePace: parseNum(row['latepace'] || row['lp']),
      avgDistance: parseNum(row['avgdistance'] || row['avgdist']),
      angles: parseStr(row['angles']),
      scratched: parseBool(row['scratched'] || row['scr']),
    };

    entry.horses.push(horse);
  }

  const races: NormalizedRace[] = [];
  for (const [raceNum, { meta, horses }] of [...raceMap.entries()].sort((a, b) => a[0] - b[0])) {
    races.push({
      number: raceNum,
      postTime: parseStr(meta['posttime'] || meta['time']),
      distance: parseStr(meta['distance'] || meta['dist']) ?? '1M',
      surface: parseStr(meta['surface']) ?? 'dirt',
      raceType: parseStr(meta['racetype'] || meta['type']) ?? 'claiming',
      purse: parseStr(meta['purse']),
      conditions: parseStr(meta['conditions'] || meta['cond']),
      horses,
    });
  }

  if (races.length === 0) {
    return { success: false, source: 'csv', error: 'No valid race rows found. Check that raceNumber column is present.' };
  }

  const racecard: NormalizedRacecard = {
    track: 'Churchill Downs',
    date,
    source: 'csv',
    races,
  };

  return { success: true, source: 'csv', racecard, rawData: rows };
}

// CSV template header row for download
export const CSV_TEMPLATE_HEADER = [
  'raceNumber', 'postPosition', 'horseName', 'morningLineOdds', 'currentOdds',
  'runStyle', 'daysOff', 'jockeyName', 'jockeyWinPct', 'trainerName', 'trainerWinPct',
  'bestSpeed', 'backSpeed', 'speedLR', 'avgSpeed', 'primePower', 'avgClass', 'lastClass',
  'earlyPace1', 'earlyPace2', 'latePace', 'avgDistance', 'angles', 'scratched',
  'distance', 'surface', 'raceType', 'postTime', 'purse', 'conditions',
].join(',');

export const CSV_TEMPLATE_EXAMPLE = [
  '1', '5', 'Cozy Curlin Kitten', '8/5', '7/2',
  'S', '33', 'Jose L. Ortiz', '21.8', 'Eddie Kenneally', '16.7',
  '', '88', '76', '80', '121.2', '113.5', '113',
  '71', '74', '91', '82', 'Key Trainer', 'false',
  '1M', 'dirt', 'claiming', '11:45 AM', '$78K', '4YO+ F&M',
].join(',');

// Provider wrapper (for use via the factory)
export const csvProvider: DataProvider = {
  name: 'csv',
  async fetchRacecard() {
    return { success: false, source: 'csv', error: 'CSV provider requires file upload — use parseCSV() directly.' };
  },
  async fetchResults() {
    return { success: false, source: 'csv', error: 'CSV results import not yet implemented.' };
  },
};
