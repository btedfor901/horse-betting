// Race 6 — Churchill Downs, 9 horses, no scratches
const BASE = 'https://horsesyndicate-production.up.railway.app';
const RACE6_ID = 'cmql3w7aj001c15s3zn2b4l9j';

const horses = [
  {
    postPosition: 1, programNumber: '1',
    horseName: 'Lambeth', morningLineOdds: '9/2',
    jockeyName: 'Jose L. Ortiz', trainerName: 'Joe Sharp',
    runStyle: 'E/P', daysOff: 29,
    avgSpeed: 99, bestSpeed: 99, backSpeed: 99, speedLR: 99, avgDistance: 99,
    primePower: 150.2, avgClass: 117.2, lastClass: 118,
    earlyPace1: 91, earlyPace2: 97, latePace: 98,
    jockeyWinPct: 0.216, trainerWinPct: 0.195,
    angles: '', scratched: false,
  },
  {
    postPosition: 2, programNumber: '2',
    horseName: 'Higgins Boat', morningLineOdds: '20/1',
    jockeyName: 'Jaime A. Torres', trainerName: 'John Alexander Ortiz',
    runStyle: 'E/P', daysOff: 28,
    avgSpeed: 92, bestSpeed: 95, backSpeed: 95, speedLR: 74, avgDistance: 92,
    primePower: 131.2, avgClass: 115.7, lastClass: 113,
    earlyPace1: 90, earlyPace2: 96, latePace: 87,
    jockeyWinPct: 0.111, trainerWinPct: 0.110,
    angles: 'Best Distance', scratched: false,
  },
  {
    postPosition: 3, programNumber: '3',
    horseName: 'Awesome Aaron', morningLineOdds: '15/1',
    jockeyName: 'Luis Saez', trainerName: 'N. Wayne Casse',
    runStyle: 'E/P', daysOff: 35,
    avgSpeed: 73, bestSpeed: null, backSpeed: null, speedLR: 83, avgDistance: 73,
    primePower: 140.6, avgClass: 116.4, lastClass: 115,
    earlyPace1: 92, earlyPace2: 91, latePace: 74,
    jockeyWinPct: 0.154, trainerWinPct: 0.152,
    angles: '', scratched: false,
  },
  {
    postPosition: 4, programNumber: '4',
    horseName: 'Irish Aces', morningLineOdds: '7/2',
    jockeyName: 'Tyler Gaffalione', trainerName: 'Brendan P. Walsh',
    runStyle: 'E/P', daysOff: 437,
    avgSpeed: 96, bestSpeed: 99, backSpeed: null, speedLR: 96, avgDistance: 96,
    primePower: 145.1, avgClass: 118.7, lastClass: 118,
    earlyPace1: 88, earlyPace2: 101, latePace: 89,
    jockeyWinPct: 0.164, trainerWinPct: 0.169,
    angles: 'Best Distance,Clocker Special', scratched: false,
  },
  {
    postPosition: 5, programNumber: '5',
    horseName: 'Funtastic Again', morningLineOdds: '5/1',
    jockeyName: 'Florent Geroux', trainerName: 'Wesley A. Ward',
    runStyle: 'E', daysOff: 195,
    avgSpeed: 92, bestSpeed: null, backSpeed: null, speedLR: 24, avgDistance: 92,
    primePower: 114.6, avgClass: 112.6, lastClass: 106,
    earlyPace1: 100, earlyPace2: 105, latePace: 80,
    jockeyWinPct: 0.142, trainerWinPct: 0.256,
    angles: 'Key Trainer', scratched: false,
  },
  {
    postPosition: 6, programNumber: '6',
    horseName: 'Idratherbeblessed', morningLineOdds: '10/1',
    jockeyName: 'Joel Rosario', trainerName: 'Michael J. Maker',
    runStyle: 'E', daysOff: 15,
    avgSpeed: 89, bestSpeed: 94, backSpeed: 96, speedLR: 86, avgDistance: 89,
    primePower: 138, avgClass: 116.2, lastClass: 116,
    earlyPace1: 86, earlyPace2: 91, latePace: 86,
    jockeyWinPct: 0.159, trainerWinPct: 0.186,
    angles: '', scratched: false,
  },
  {
    postPosition: 7, programNumber: '7',
    horseName: 'Herchee', morningLineOdds: '8/1',
    jockeyName: 'Edgar Morales', trainerName: 'Helen Pitts',
    runStyle: 'E/P', daysOff: 29,
    avgSpeed: 94, bestSpeed: 102, backSpeed: 94, speedLR: 94, avgDistance: 94,
    primePower: 144.8, avgClass: 117.8, lastClass: 116,
    earlyPace1: 95, earlyPace2: 100, latePace: 88,
    jockeyWinPct: 0.088, trainerWinPct: 0.107,
    angles: '', scratched: false,
  },
  {
    postPosition: 8, programNumber: '8',
    horseName: 'West Hollywood', morningLineOdds: '2/1',
    jockeyName: 'Irad Ortiz, Jr.', trainerName: 'Brad H. Cox',
    runStyle: 'P', daysOff: 20,
    avgSpeed: 90, bestSpeed: 96, backSpeed: 90, speedLR: 90, avgDistance: 90,
    primePower: 156, avgClass: 117.5, lastClass: 119,
    earlyPace1: 80, earlyPace2: 86, latePace: 94,
    jockeyWinPct: 0.233, trainerWinPct: 0.263,
    angles: 'Top Pick,Hot Jockey,Hot Trainer,Combo,Best Distance', scratched: false,
  },
  {
    postPosition: 9, programNumber: '9',
    horseName: 'Theismann', morningLineOdds: '15/1',
    jockeyName: 'Danny Sheehy', trainerName: 'Peter Eurton',
    runStyle: 'E/P', daysOff: 29,
    avgSpeed: 95, bestSpeed: 99, backSpeed: 99, speedLR: 99, avgDistance: 95,
    primePower: 146.3, avgClass: 117.5, lastClass: 118,
    earlyPace1: 91, earlyPace2: 99, latePace: 88,
    jockeyWinPct: 0.099, trainerWinPct: 0.178,
    angles: '', scratched: false,
  },
];

const res = await fetch(`${BASE}/api/races/${RACE6_ID}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ horses }),
});

const data = await res.json();
if (!res.ok) { console.error('ERROR:', data); process.exit(1); }

console.log('Updated Race 6 — horses saved:');
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
