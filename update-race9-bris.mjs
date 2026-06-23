// Race 9 — Churchill Downs, 9 horses, no scratches
const BASE = 'https://horsesyndicate-production.up.railway.app';
const RACE9_ID = 'cmql3w7ti002315s3zuv5d8bs';

const horses = [
  {
    postPosition: 1, programNumber: '1',
    horseName: 'Pookie', morningLineOdds: '10/1',
    jockeyName: 'Brian Joseph Hernandez, Jr.', trainerName: 'Ian R. Wilkes',
    runStyle: 'P', daysOff: 62,
    avgSpeed: 74, bestSpeed: 73, backSpeed: 82, speedLR: 74, avgDistance: 74,
    primePower: 110.2, avgClass: 109.9, lastClass: 111,
    earlyPace1: 83, earlyPace2: 83, latePace: 72,
    jockeyWinPct: 0.138, trainerWinPct: 0.118,
    angles: '', scratched: false,
  },
  {
    postPosition: 2, programNumber: '2',
    horseName: 'Jerseys Parade', morningLineOdds: '30/1',
    jockeyName: 'Gabriel Saez', trainerName: 'Charles Meredith',
    runStyle: 'E', daysOff: 57,
    avgSpeed: 82, bestSpeed: null, backSpeed: null, speedLR: 82, avgDistance: 82,
    primePower: 114.6, avgClass: 112.3, lastClass: 112,
    earlyPace1: 89, earlyPace2: 79, latePace: 68,
    jockeyWinPct: 0.084, trainerWinPct: 0.100,
    angles: '', scratched: false,
  },
  {
    postPosition: 3, programNumber: '3',
    horseName: 'Smokin Hot Blonde', morningLineOdds: '30/1',
    jockeyName: 'Alex Achard', trainerName: 'James A. Kelley',
    runStyle: 'E', daysOff: 57,
    avgSpeed: 60, bestSpeed: 72, backSpeed: 74, speedLR: 56, avgDistance: 60,
    primePower: 91.1, avgClass: 106.4, lastClass: 107,
    earlyPace1: 88, earlyPace2: 76, latePace: 35,
    jockeyWinPct: 0.111, trainerWinPct: 0.061,
    angles: '', scratched: false,
  },
  {
    postPosition: 4, programNumber: '4',
    horseName: 'Sunshine Daydream', morningLineOdds: '12/1',
    jockeyName: 'Ben Curtis', trainerName: 'Joe Sharp',
    runStyle: 'E/P', daysOff: 40,
    avgSpeed: 83, bestSpeed: 84, backSpeed: 84, speedLR: 82, avgDistance: 83,
    primePower: 128.3, avgClass: 114.2, lastClass: 115,
    earlyPace1: 91, earlyPace2: 91, latePace: 76,
    jockeyWinPct: 0.161, trainerWinPct: 0.195,
    angles: 'Clocker Special', scratched: false,
  },
  {
    postPosition: 5, programNumber: '5',
    horseName: 'Ensorcell', morningLineOdds: '20/1',
    jockeyName: 'Rafael Bejarano', trainerName: 'Ron Moquett',
    runStyle: 'E/P', daysOff: 25,
    avgSpeed: 77, bestSpeed: 81, backSpeed: 81, speedLR: 72, avgDistance: 77,
    primePower: 120.8, avgClass: 112.3, lastClass: 112,
    earlyPace1: 71, earlyPace2: 66, latePace: 78,
    jockeyWinPct: 0.142, trainerWinPct: 0.117,
    angles: '', scratched: false,
  },
  {
    postPosition: 6, programNumber: '6',
    horseName: 'Competitive Market', morningLineOdds: '9/5',
    jockeyName: 'Tyler Gaffalione', trainerName: 'Chad C. Brown',
    runStyle: 'P', daysOff: 40,
    avgSpeed: 84, bestSpeed: 82, backSpeed: 87, speedLR: 85, avgDistance: 84,
    primePower: 136.9, avgClass: 114.6, lastClass: 116,
    earlyPace1: 91, earlyPace2: 93, latePace: 75,
    jockeyWinPct: 0.164, trainerWinPct: 0.228,
    angles: '', scratched: false,
  },
  {
    postPosition: 7, programNumber: '7',
    horseName: 'La Cantera', morningLineOdds: '6/1',
    jockeyName: 'Luis Saez', trainerName: 'Carlos A. David',
    runStyle: 'P', daysOff: 62,
    avgSpeed: 86, bestSpeed: null, backSpeed: 87, speedLR: 84, avgDistance: 86,
    primePower: 133.4, avgClass: 113.4, lastClass: 115,
    earlyPace1: 86, earlyPace2: 91, latePace: 82,
    jockeyWinPct: 0.154, trainerWinPct: 0.197,
    angles: 'Exiting Key Race', scratched: false,
  },
  {
    postPosition: 8, programNumber: '8',
    horseName: 'Miss Pharaoh', morningLineOdds: '4/1',
    jockeyName: 'Mario Gutierrez', trainerName: 'Matthew P. Sims',
    runStyle: 'P', daysOff: 27,
    avgSpeed: 83, bestSpeed: 83, backSpeed: 83, speedLR: 80, avgDistance: 83,
    primePower: 130.4, avgClass: 113.8, lastClass: 115,
    earlyPace1: 75, earlyPace2: 74, latePace: 90,
    jockeyWinPct: 0.115, trainerWinPct: 0.152,
    angles: '', scratched: false,
  },
  {
    postPosition: 9, programNumber: '9',
    horseName: 'Amberglen', morningLineOdds: '5/2',
    jockeyName: 'Irad Ortiz, Jr.', trainerName: 'Brad H. Cox',
    runStyle: 'P', daysOff: 71,
    avgSpeed: 81, bestSpeed: null, backSpeed: 84, speedLR: 81, avgDistance: 81,
    primePower: 138.7, avgClass: 114, lastClass: 114,
    earlyPace1: 63, earlyPace2: 71, latePace: 93,
    jockeyWinPct: 0.233, trainerWinPct: 0.263,
    angles: 'Top Pick,Hot Jockey,Hot Trainer,Combo', scratched: false,
  },
];

const res = await fetch(`${BASE}/api/races/${RACE9_ID}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ horses }),
});

const data = await res.json();
if (!res.ok) { console.error('ERROR:', data); process.exit(1); }

console.log('Updated Race 9 — horses saved:');
for (const h of data.horses) {
  const scr = h.scratched ? ' [SCR]' : '      ';
  console.log(
    `  PP${String(h.postPosition).padEnd(2)}${scr} ${h.horseName.padEnd(22)} ` +
    `spdLR=${h.speedLR ?? '--'} primePwr=${h.primePower ?? '--'} avgCls=${h.avgClass ?? '--'} ` +
    `EP2=${h.earlyPace2 ?? '--'} LP=${h.latePace ?? '--'} ` +
    `jky=${((h.jockeyWinPct ?? 0)*100).toFixed(1)}% trn=${((h.trainerWinPct ?? 0)*100).toFixed(1)}% ` +
    `angles="${h.angles ?? ''}"`
  );
}
