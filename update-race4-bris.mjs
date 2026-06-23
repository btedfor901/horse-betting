// Race 4 — 6f Dirt, $50K Claiming, 8 horses
const BASE = 'https://horsesyndicate-production.up.railway.app';
const RACE4_ID = 'cmql3w6y9000r15s3nyox6913';

const horses = [
  {
    postPosition: 1, programNumber: '1',
    horseName: 'Landing Craft', morningLineOdds: '8/1',
    jockeyName: 'Edgar Morales', trainerName: 'Jordan Blair',
    runStyle: 'E/P2', daysOff: 21,
    avgSpeed: 78, bestSpeed: 64, backSpeed: 80, speedLR: 82, avgDistance: 78,
    primePower: 122.2, avgClass: 112.4, lastClass: 114,
    earlyPace1: 82, earlyPace2: 86, latePace: 82,
    jockeyWinPct: 0.088, trainerWinPct: 0.109,
    angles: 'Key Trainer', scratched: false,
  },
  {
    postPosition: 2, programNumber: '2',
    horseName: 'Nash Potatoes', morningLineOdds: '10/1',
    jockeyName: 'Gabriel Saez', trainerName: 'J. Kent Sweezey',
    runStyle: 'E/P3', daysOff: 15,
    avgSpeed: 78, bestSpeed: 83, backSpeed: 83, speedLR: 83, avgDistance: 78,
    primePower: 116.2, avgClass: 110.8, lastClass: 110,
    earlyPace1: 82, earlyPace2: 86, latePace: 81,
    jockeyWinPct: 0.084, trainerWinPct: 0.128,
    angles: '', scratched: false,
  },
  {
    postPosition: 3, programNumber: '3',
    horseName: 'Royal Sapphire', morningLineOdds: '12/1',
    jockeyName: 'Summer Pauly', trainerName: 'Genaro Garcia',
    runStyle: 'E5', daysOff: 21,
    avgSpeed: 80, bestSpeed: 77, backSpeed: 82, speedLR: 82, avgDistance: 80,
    primePower: 118.9, avgClass: 110.9, lastClass: 113,
    earlyPace1: 91, earlyPace2: 88, latePace: 83,
    jockeyWinPct: 0.196, trainerWinPct: 0.117,
    angles: '', scratched: false,
  },
  {
    postPosition: 4, programNumber: '4',
    horseName: 'Vanderbilt', morningLineOdds: '6/5',
    jockeyName: 'Irad Ortiz, Jr.', trainerName: 'Brad H. Cox',
    runStyle: 'E6', daysOff: 21,
    avgSpeed: 86, bestSpeed: 88, backSpeed: 86, speedLR: 86, avgDistance: 86,
    primePower: 133.5, avgClass: 115.1, lastClass: 115,
    earlyPace1: 91, earlyPace2: 97, latePace: 83,
    jockeyWinPct: 0.233, trainerWinPct: 0.263,
    angles: 'Top Pick,Best Bet,Hot Jockey,Hot Trainer,Combo', scratched: false,
  },
  {
    postPosition: 5, programNumber: '5',
    horseName: 'Spurgeon', morningLineOdds: '20/1',
    jockeyName: 'Rafael Bejarano', trainerName: 'Ed Moger, Jr.',
    runStyle: 'S0', daysOff: 307,
    avgSpeed: null, bestSpeed: null, backSpeed: null, speedLR: 67, avgDistance: null,
    primePower: 109.6, avgClass: 110.8, lastClass: 109,
    earlyPace1: null, earlyPace2: null, latePace: null,
    jockeyWinPct: 0.142, trainerWinPct: 0.153,
    angles: '', scratched: false,
  },
  {
    postPosition: 6, programNumber: '6',
    horseName: 'Evan On Earth', morningLineOdds: '7/2',
    jockeyName: 'Tyler Gaffalione', trainerName: 'Gregory D. Foley',
    runStyle: 'E6', daysOff: 174,
    avgSpeed: 83, bestSpeed: 86, backSpeed: 86, speedLR: 78, avgDistance: 83,
    primePower: 116.8, avgClass: 112.3, lastClass: 112,
    earlyPace1: 90, earlyPace2: 93, latePace: 82,
    jockeyWinPct: 0.164, trainerWinPct: 0.142,
    angles: '', scratched: false,
  },
  {
    postPosition: 7, programNumber: '7',
    horseName: 'Army Wildcatter', morningLineOdds: '12/1',
    jockeyName: 'Alex Achard', trainerName: 'John Ennis',
    runStyle: 'E/P2', daysOff: 25,
    avgSpeed: 79, bestSpeed: null, backSpeed: 80, speedLR: 78, avgDistance: 79,
    primePower: 117.9, avgClass: 111.3, lastClass: 111,
    earlyPace1: 85, earlyPace2: 86, latePace: 83,
    jockeyWinPct: 0.142, trainerWinPct: 0.112,
    angles: 'Exiting Key Race', scratched: false,
  },
  {
    postPosition: 8, programNumber: '8',
    horseName: 'Justifreak', morningLineOdds: '9/2',
    jockeyName: 'Jose L. Ortiz', trainerName: 'Eddie Kenneally',
    runStyle: 'E/P3', daysOff: 341,
    avgSpeed: 75, bestSpeed: 91, backSpeed: null, speedLR: 66, avgDistance: 75,
    primePower: 115.1, avgClass: 109.3, lastClass: 110,
    earlyPace1: 93, earlyPace2: 96, latePace: 69,
    jockeyWinPct: 0.216, trainerWinPct: 0.167,
    angles: 'Key Trainer', scratched: false,
  },
];

const res = await fetch(`${BASE}/api/races/${RACE4_ID}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ horses }),
});

const data = await res.json();
if (!res.ok) { console.error('ERROR:', data); process.exit(1); }

console.log('Updated Race 4 — horses saved:');
for (const h of data.horses) {
  console.log(
    `  PP${h.postPosition} ${h.horseName.padEnd(22)} ` +
    `avgSpd=${h.avgSpeed ?? '--'} bestSpd=${h.bestSpeed ?? '--'} bkSpd=${h.backSpeed ?? '--'} spdLR=${h.speedLR ?? '--'} ` +
    `primePwr=${h.primePower ?? '--'} avgCls=${h.avgClass ?? '--'} ` +
    `EP1=${h.earlyPace1 ?? '--'} EP2=${h.earlyPace2 ?? '--'} LP=${h.latePace ?? '--'} ` +
    `angles="${h.angles ?? ''}"`
  );
}
