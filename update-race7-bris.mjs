// Race 7 — $20K Claiming, 6.5f Dirt, 3YO+, Churchill Downs
// Scratched: Guardian (PP4), Mischief Mania (PP5), Coastal Breeze (PP7)
const BASE = 'https://horsesyndicate-production.up.railway.app';
const RACE7_ID = 'cmql3w7gl001m15s3pjhgi6o2';

const horses = [
  {
    postPosition: 1, programNumber: '1',
    horseName: 'Mamoot', morningLineOdds: '15/1',
    jockeyName: 'Alex Achard', trainerName: 'Miguel Angel Silva',
    runStyle: 'E/P', daysOff: 10,
    avgSpeed: 69, bestSpeed: null, backSpeed: 84, speedLR: 78, avgDistance: 69,
    primePower: 111.6, avgClass: 107.4, lastClass: 110,
    earlyPace1: 89, earlyPace2: 84, latePace: 74,
    jockeyWinPct: 0.142, trainerWinPct: 0.104,
    angles: '', scratched: false,
  },
  {
    postPosition: 2, programNumber: '2',
    horseName: 'League of Legends', morningLineOdds: '8/1',
    jockeyName: 'Francisco Arrieta', trainerName: 'Randy L. Morse',
    runStyle: 'S', daysOff: 19,
    avgSpeed: 76, bestSpeed: 92, backSpeed: 76, speedLR: 76, avgDistance: 76,
    primePower: 114.2, avgClass: 111, lastClass: 112,
    earlyPace1: 77, earlyPace2: 71, latePace: 96,
    jockeyWinPct: 0.170, trainerWinPct: 0.124,
    angles: 'Hot Jockey', scratched: false,
  },
  {
    postPosition: 3, programNumber: '3',
    horseName: 'Stormy At Midnight', morningLineOdds: '10/1',
    jockeyName: 'Emmanuel Esquivel', trainerName: 'Miguel Angel Silva',
    runStyle: 'E', daysOff: 42,
    avgSpeed: 71, bestSpeed: null, backSpeed: 87, speedLR: 68, avgDistance: 71,
    primePower: 107.6, avgClass: 108.6, lastClass: 109,
    earlyPace1: 99, earlyPace2: 100, latePace: 62,
    jockeyWinPct: 0.141, trainerWinPct: 0.104,
    angles: 'Clocker Special,Exiting Key Race', scratched: false,
  },
  {
    postPosition: 4, programNumber: '4',
    horseName: 'Guardian', morningLineOdds: '3/1',
    jockeyName: 'Irad Ortiz, Jr.', trainerName: 'David Jacobson',
    runStyle: 'E/P', daysOff: 9,
    avgSpeed: 83, bestSpeed: 82, backSpeed: 88, speedLR: 76, avgDistance: 83,
    primePower: 121.4, avgClass: 110.9, lastClass: 111,
    earlyPace1: 89, earlyPace2: 90, latePace: 83,
    jockeyWinPct: 0.233, trainerWinPct: 0.162,
    angles: '', scratched: true,
  },
  {
    postPosition: 5, programNumber: '5',
    horseName: 'Mischief Mania', morningLineOdds: '6/1',
    jockeyName: 'Jose L. Ortiz', trainerName: 'Linda Rice',
    runStyle: 'E/P', daysOff: 54,
    avgSpeed: 85, bestSpeed: 62, backSpeed: 87, speedLR: 68, avgDistance: 85,
    primePower: 119, avgClass: 111.6, lastClass: 109,
    earlyPace1: 91, earlyPace2: 90, latePace: 87,
    jockeyWinPct: 0.216, trainerWinPct: 0.225,
    angles: '', scratched: true,
  },
  {
    postPosition: 6, programNumber: '6',
    horseName: 'Forty Love', morningLineOdds: '5/1',
    jockeyName: 'Tyler Gaffalione', trainerName: 'Sandino R. Hernandez, Jr.',
    runStyle: 'P', daysOff: 61,
    avgSpeed: 83, bestSpeed: 82, backSpeed: 87, speedLR: 80, avgDistance: 83,
    primePower: 118.3, avgClass: 111.8, lastClass: 111,
    earlyPace1: 84, earlyPace2: 86, latePace: 90,
    jockeyWinPct: 0.164, trainerWinPct: 0.111,
    angles: '', scratched: false,
  },
  {
    postPosition: 7, programNumber: '7',
    horseName: 'Coastal Breeze', morningLineOdds: '9/2',
    jockeyName: 'Luis Saez', trainerName: 'Matt A. Shirer',
    runStyle: 'E/P', daysOff: 28,
    avgSpeed: 80, bestSpeed: null, backSpeed: 83, speedLR: 80, avgDistance: 80,
    primePower: 116.5, avgClass: 110.4, lastClass: 112,
    earlyPace1: 93, earlyPace2: 92, latePace: 81,
    jockeyWinPct: 0.154, trainerWinPct: 0.162,
    angles: '', scratched: true,
  },
  {
    postPosition: 8, programNumber: '8',
    horseName: "Mitty's Griddy", morningLineOdds: '7/2',
    jockeyName: 'Edgar Morales', trainerName: 'Chris A. Hartman',
    runStyle: 'E/P', daysOff: 48,
    avgSpeed: 84, bestSpeed: null, backSpeed: 87, speedLR: 77, avgDistance: 84,
    primePower: 121.4, avgClass: 112.1, lastClass: 112,
    earlyPace1: 90, earlyPace2: 95, latePace: 82,
    jockeyWinPct: 0.088, trainerWinPct: 0.114,
    angles: 'Top Pick,Key Trainer', scratched: false,
  },
  {
    postPosition: 9, programNumber: '9',
    horseName: 'Livehappy', morningLineOdds: '20/1',
    jockeyName: 'Gerardo Corrales', trainerName: 'Tito Moreno',
    runStyle: 'E', daysOff: 28,
    avgSpeed: 76, bestSpeed: 85, backSpeed: 85, speedLR: 67, avgDistance: 76,
    primePower: 112.3, avgClass: 110.6, lastClass: 109,
    earlyPace1: 88, earlyPace2: 90, latePace: 73,
    jockeyWinPct: 0.085, trainerWinPct: 0.020,
    angles: '', scratched: false,
  },
];

const res = await fetch(`${BASE}/api/races/${RACE7_ID}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ horses }),
});

const data = await res.json();
if (!res.ok) { console.error('ERROR:', data); process.exit(1); }

console.log('Updated Race 7 — horses saved:');
for (const h of data.horses) {
  const scr = h.scratched ? ' [SCR]' : '      ';
  console.log(
    `  PP${String(h.postPosition).padEnd(2)}${scr} ${h.horseName.padEnd(22)} ` +
    `spdLR=${h.speedLR ?? '--'} primePwr=${h.primePower ?? '--'} avgCls=${h.avgClass ?? '--'} ` +
    `EP1=${h.earlyPace1 ?? '--'} EP2=${h.earlyPace2 ?? '--'} LP=${h.latePace ?? '--'} ` +
    `jky=${((h.jockeyWinPct ?? 0)*100).toFixed(1)}% trn=${((h.trainerWinPct ?? 0)*100).toFixed(1)}% ` +
    `angles="${h.angles ?? ''}"`
  );
}
