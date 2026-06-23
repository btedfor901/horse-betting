// Race 8 — Churchill Downs, 6 horses, no scratches
const BASE = 'https://horsesyndicate-production.up.railway.app';
const RACE8_ID = 'cmql3w7nl001w15s3t3d307w4';

const horses = [
  {
    postPosition: 1, programNumber: '1',
    horseName: 'City Scene', morningLineOdds: '20/1',
    jockeyName: 'Luis Raul Rivera', trainerName: 'James R. Jackson',
    runStyle: 'E/P', daysOff: 21,
    avgSpeed: 84, bestSpeed: 94, backSpeed: 94, speedLR: 83, avgDistance: 84,
    primePower: 138.5, avgClass: 116, lastClass: 117,
    earlyPace1: 93, earlyPace2: 99, latePace: 78,
    jockeyWinPct: 0.187, trainerWinPct: 0.168,
    angles: 'Top Pick,Key Trainer,Best Distance', scratched: false,
  },
  {
    postPosition: 2, programNumber: '2',
    horseName: 'Tapit Quick', morningLineOdds: '8/1',
    jockeyName: 'Brian Joseph Hernandez, Jr.', trainerName: 'Dallas Stewart',
    runStyle: 'P', daysOff: 126,
    avgSpeed: 91, bestSpeed: 90, backSpeed: 93, speedLR: 72, avgDistance: 91,
    primePower: 125.5, avgClass: 116, lastClass: 113,
    earlyPace1: 90, earlyPace2: 96, latePace: 88,
    jockeyWinPct: 0.138, trainerWinPct: 0.136,
    angles: 'Exiting Key Race', scratched: false,
  },
  {
    postPosition: 3, programNumber: '3',
    horseName: 'Silent Law', morningLineOdds: '4/1',
    jockeyName: 'Martin Garcia', trainerName: 'Bob Baffert',
    runStyle: 'E', daysOff: 173,
    avgSpeed: 89, bestSpeed: 91, backSpeed: 95, speedLR: 87, avgDistance: 89,
    primePower: 135.5, avgClass: 116.3, lastClass: 116,
    earlyPace1: 98, earlyPace2: 105, latePace: 76,
    jockeyWinPct: 0.091, trainerWinPct: 0.287,
    angles: 'Blinkers Off', scratched: false,
  },
  {
    postPosition: 4, programNumber: '4',
    horseName: 'Roswell', morningLineOdds: '7/2',
    jockeyName: 'Irad Ortiz, Jr.', trainerName: 'William I. Mott',
    runStyle: 'E/P', daysOff: 58,
    avgSpeed: 89, bestSpeed: 98, backSpeed: 95, speedLR: 92, avgDistance: 89,
    primePower: 129.5, avgClass: 117.4, lastClass: 117,
    earlyPace1: 84, earlyPace2: 83, latePace: 99,
    jockeyWinPct: 0.233, trainerWinPct: 0.160,
    angles: 'Hot Jockey', scratched: false,
  },
  {
    postPosition: 5, programNumber: '5',
    horseName: 'Anakarina', morningLineOdds: '5/2',
    jockeyName: 'Erik Asmussen', trainerName: 'Dallas Stewart',
    runStyle: 'E', daysOff: 54,
    avgSpeed: 68, bestSpeed: 91, backSpeed: 91, speedLR: 89, avgDistance: 68,
    primePower: 129.4, avgClass: 114.6, lastClass: 117,
    earlyPace1: 89, earlyPace2: 89, latePace: 77,
    jockeyWinPct: 0.184, trainerWinPct: 0.136,
    angles: '', scratched: false,
  },
  {
    postPosition: 6, programNumber: '6',
    horseName: 'Cash Call', morningLineOdds: '8/5',
    jockeyName: 'Florent Geroux', trainerName: 'Bob Baffert',
    runStyle: 'E/P', daysOff: 96,
    avgSpeed: 87, bestSpeed: 100, backSpeed: 87, speedLR: 87, avgDistance: 87,
    primePower: 133.3, avgClass: 115.9, lastClass: 115,
    earlyPace1: 87, earlyPace2: 93, latePace: 87,
    jockeyWinPct: 0.142, trainerWinPct: 0.287,
    angles: 'Best Distance,Clocker Special,Exiting Key Race', scratched: false,
  },
];

const res = await fetch(`${BASE}/api/races/${RACE8_ID}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ horses }),
});

const data = await res.json();
if (!res.ok) { console.error('ERROR:', data); process.exit(1); }

console.log('Updated Race 8 — horses saved:');
for (const h of data.horses) {
  const scr = h.scratched ? ' [SCR]' : '      ';
  console.log(
    `  PP${String(h.postPosition).padEnd(2)}${scr} ${h.horseName.padEnd(20)} ` +
    `spdLR=${h.speedLR ?? '--'} primePwr=${h.primePower ?? '--'} avgCls=${h.avgClass ?? '--'} ` +
    `EP1=${h.earlyPace1 ?? '--'} EP2=${h.earlyPace2 ?? '--'} LP=${h.latePace ?? '--'} ` +
    `jky=${((h.jockeyWinPct ?? 0)*100).toFixed(1)}% trn=${((h.trainerWinPct ?? 0)*100).toFixed(1)}% ` +
    `angles="${h.angles ?? ''}"`
  );
}
