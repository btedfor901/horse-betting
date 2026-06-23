// Race 5 — 5f Dirt, MSW Colts 2yo, 11 entered / 4 scratched
// Scratched: Prairie Avenue (PP1), Baytown Theo (PP6), Cold Kiss (PP8), Bomani (PP10)
// Only Trim Castle, Bourbon Town, Crossfire have prior speed figures — rest are first-timers
const BASE = 'https://horsesyndicate-production.up.railway.app';
const RACE5_ID = 'cmql3w74g001015s3ktldyrif';

const horses = [
  {
    postPosition: 1, programNumber: '20',
    horseName: 'Prairie Avenue', morningLineOdds: '20/1',
    jockeyName: 'Joel Rosario', trainerName: 'Lane D. Johnston',
    runStyle: null, daysOff: null,
    avgSpeed: null, bestSpeed: null, backSpeed: null, speedLR: null, avgDistance: null,
    primePower: null, avgClass: null, lastClass: null,
    earlyPace1: null, earlyPace2: null, latePace: null,
    jockeyWinPct: 0.159, trainerWinPct: 0.061,
    angles: '', scratched: true,
  },
  {
    postPosition: 2, programNumber: '15',
    horseName: 'Ditlihi', morningLineOdds: '15/1',
    jockeyName: 'Danny Sheehy', trainerName: 'John Ennis',
    runStyle: null, daysOff: null,
    avgSpeed: null, bestSpeed: null, backSpeed: null, speedLR: null, avgDistance: null,
    primePower: null, avgClass: null, lastClass: null,
    earlyPace1: null, earlyPace2: null, latePace: null,
    jockeyWinPct: 0.099, trainerWinPct: 0.112,
    angles: '', scratched: false,
  },
  {
    postPosition: 3, programNumber: '5',
    horseName: 'See You Soon', morningLineOdds: '5/1',
    jockeyName: 'Irad Ortiz, Jr.', trainerName: 'Joe Sharp',
    runStyle: null, daysOff: null,
    avgSpeed: null, bestSpeed: null, backSpeed: null, speedLR: null, avgDistance: null,
    primePower: null, avgClass: null, lastClass: null,
    earlyPace1: null, earlyPace2: null, latePace: null,
    jockeyWinPct: 0.233, trainerWinPct: 0.195,
    angles: 'Hot Jockey', scratched: false,
  },
  {
    postPosition: 4, programNumber: '8',
    horseName: 'Karajan', morningLineOdds: '8/1',
    jockeyName: 'Martin Garcia', trainerName: 'Dale L. Romans',
    runStyle: null, daysOff: null,
    avgSpeed: null, bestSpeed: null, backSpeed: null, speedLR: null, avgDistance: null,
    primePower: null, avgClass: null, lastClass: null,
    earlyPace1: null, earlyPace2: null, latePace: null,
    jockeyWinPct: 0.091, trainerWinPct: 0.154,
    angles: '', scratched: false,
  },
  {
    postPosition: 5, programNumber: '3',
    horseName: 'Trim Castle', morningLineOdds: '3/1',
    jockeyName: 'Tyler Gaffalione', trainerName: 'John Ennis',
    runStyle: 'E/P4', daysOff: 22,
    avgSpeed: 79, bestSpeed: 79, backSpeed: 79, speedLR: 79, avgDistance: 79,
    primePower: 121, avgClass: 113.9, lastClass: 114,
    earlyPace1: null, earlyPace2: 96, latePace: 74,
    jockeyWinPct: 0.164, trainerWinPct: 0.112,
    angles: 'Top Pick,Clocker Special', scratched: false,
  },
  {
    postPosition: 6, programNumber: '10',
    horseName: 'Baytown Theo', morningLineOdds: '10/1',
    jockeyName: 'Agustin Gomez', trainerName: 'Paul McEntee',
    runStyle: null, daysOff: null,
    avgSpeed: null, bestSpeed: null, backSpeed: null, speedLR: null, avgDistance: null,
    primePower: null, avgClass: null, lastClass: null,
    earlyPace1: null, earlyPace2: null, latePace: null,
    jockeyWinPct: 0.107, trainerWinPct: 0.075,
    angles: '', scratched: true,
  },
  {
    postPosition: 7, programNumber: '12',
    horseName: 'King Crusher', morningLineOdds: '12/1',
    jockeyName: 'Adam Beschizza', trainerName: 'George Weaver',
    runStyle: null, daysOff: null,
    avgSpeed: null, bestSpeed: null, backSpeed: null, speedLR: null, avgDistance: null,
    primePower: null, avgClass: null, lastClass: null,
    earlyPace1: null, earlyPace2: null, latePace: null,
    jockeyWinPct: 0.084, trainerWinPct: 0.183,
    angles: 'Key Trainer', scratched: false,
  },
  {
    postPosition: 8, programNumber: '10',
    horseName: 'Cold Kiss', morningLineOdds: '10/1',
    jockeyName: 'Edgar Morales', trainerName: 'Michael J. Maker',
    runStyle: null, daysOff: null,
    avgSpeed: null, bestSpeed: null, backSpeed: null, speedLR: null, avgDistance: null,
    primePower: null, avgClass: null, lastClass: null,
    earlyPace1: null, earlyPace2: null, latePace: null,
    jockeyWinPct: 0.088, trainerWinPct: 0.186,
    angles: '', scratched: true,
  },
  {
    postPosition: 9, programNumber: '6',
    horseName: 'Bourbon Town', morningLineOdds: '6/1',
    jockeyName: 'Luis Saez', trainerName: 'Rey Hernandez',
    runStyle: 'E6', daysOff: 25,
    avgSpeed: 68, bestSpeed: 68, backSpeed: 68, speedLR: 68, avgDistance: 68,
    primePower: 119.4, avgClass: 111, lastClass: 112,
    earlyPace1: 96, earlyPace2: 95, latePace: 65,
    jockeyWinPct: 0.154, trainerWinPct: 0.124,
    angles: '', scratched: false,
  },
  {
    postPosition: 10, programNumber: '20',
    horseName: 'Bomani', morningLineOdds: '20/1',
    jockeyName: 'Mario Gutierrez', trainerName: 'Pavel Matejka',
    runStyle: null, daysOff: null,
    avgSpeed: null, bestSpeed: null, backSpeed: null, speedLR: null, avgDistance: null,
    primePower: null, avgClass: null, lastClass: null,
    earlyPace1: null, earlyPace2: null, latePace: null,
    jockeyWinPct: 0.115, trainerWinPct: 0.140,
    angles: '', scratched: true,
  },
  {
    postPosition: 11, programNumber: '4',
    horseName: 'Crossfire', morningLineOdds: '4/1',
    jockeyName: 'Jose L. Ortiz', trainerName: 'Brendan P. Walsh',
    runStyle: 'E5', daysOff: 36,
    avgSpeed: 75, bestSpeed: 75, backSpeed: 75, speedLR: 75, avgDistance: 75,
    primePower: 121.4, avgClass: 113.3, lastClass: 113,
    earlyPace1: null, earlyPace2: 92, latePace: 75,
    jockeyWinPct: 0.216, trainerWinPct: 0.169,
    angles: 'Blinkers On', scratched: false,
  },
];

const res = await fetch(`${BASE}/api/races/${RACE5_ID}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ horses }),
});

const data = await res.json();
if (!res.ok) { console.error('ERROR:', data); process.exit(1); }

console.log('Updated Race 5 — horses saved:');
for (const h of data.horses) {
  const scr = h.scratched ? ' [SCR]' : '      ';
  console.log(
    `  PP${String(h.postPosition).padEnd(2)}${scr} ${h.horseName.padEnd(20)} ` +
    `spdLR=${h.speedLR ?? '--'} primePwr=${h.primePower ?? '--'} avgCls=${h.avgClass ?? '--'} ` +
    `EP2=${h.earlyPace2 ?? '--'} LP=${h.latePace ?? '--'} ` +
    `jky=${((h.jockeyWinPct ?? 0)*100).toFixed(1)}% trn=${((h.trainerWinPct ?? 0)*100).toFixed(1)}% ` +
    `angles="${h.angles ?? ''}"`
  );
}
