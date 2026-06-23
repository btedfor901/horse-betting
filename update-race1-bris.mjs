// Updates Race 1 (Churchill Downs, June 19 2026) with BRIS speed/pace/class figures
// Data sourced manually from BRIS screenshots provided by user

const BASE = 'https://horsesyndicate-production.up.railway.app';
const RACE1_ID = 'cmql3w6fk000115s3bgmef1dh';

// Existing horse IDs from DB (order = post position)
const existingIds = [
  'cmql3xuh3002d15s3biqb8s1g', // PP1 Story Hour
  'cmql3xuh4002e15s3g3irp7m2', // PP2 Musical Prayer
  'cmql3xuh5002f15s32ubu34sg', // PP3 Bow Draw
  'cmql3xuh6002g15s3a8jym3km', // PP4 Baytown Butterfly
  'cmql3xuh7002h15s3g51epkk1', // PP5 Cozy Curlin Kitten
  'cmql3xuh7002i15s3l6qeum4y', // PP6 Barbratina
];

// BRIS data from screenshots
// avgSpeed     = "Average Distance" col (img1) = "AVG SPD" in summary — at-distance avg figure
// bestSpeed    = "Best Speed" col (img1)
// backSpeed    = "BACK SPD" in summary
// speedLR      = "SPD LR" in summary
// primePower   = "PRM PWR" in summary (more decimal precision)
// avgClass     = "AVG CLS" in summary
// lastClass    = "Last Class" from screenshot 2
// earlyPace1/2 = "Early Pace 1/2" screenshot 3
// latePace     = "Late Pace" screenshot 3
// jockeyWinPct / trainerWinPct = "W% JKY / W% TRN" from summary

const horses = [
  {
    postPosition: 1,
    programNumber: '1',
    horseName: 'Story Hour',
    morningLineOdds: '15/1',
    jockeyName: 'Cristian A. Torres',
    trainerName: 'Robert Medina',
    runStyle: 'E5',
    daysOff: 36,
    avgSpeed: 78,
    bestSpeed: 82,
    backSpeed: 87,
    speedLR: 68,
    avgDistance: 78,
    primePower: 118,
    avgClass: 113.4,
    lastClass: 111,
    earlyPace1: 81,
    earlyPace2: 84,
    latePace: 77,
    jockeyWinPct: 0.134,
    trainerWinPct: 0.108,
    angles: 'Hot Trainer,Horse for Course',
    scratched: false,
  },
  {
    postPosition: 2,
    programNumber: '3',
    horseName: 'Musical Prayer',
    morningLineOdds: '3/1',
    jockeyName: 'Irad Ortiz, Jr.',
    trainerName: 'Randy L. Morse',
    runStyle: 'E8',
    daysOff: 29,
    avgSpeed: null,
    bestSpeed: null,
    backSpeed: null,
    speedLR: 80,
    avgDistance: null,
    primePower: 122.4,
    avgClass: 114.2,
    lastClass: 114,
    earlyPace1: null,
    earlyPace2: null,
    latePace: null,
    jockeyWinPct: 0.233,
    trainerWinPct: 0.124,
    angles: 'Top Pick,Hot Jockey,Clocker Special',
    scratched: false,
  },
  {
    postPosition: 3,
    programNumber: '5',
    horseName: 'Bow Draw',
    morningLineOdds: '6/1',
    jockeyName: 'Keith J. Asmussen',
    trainerName: 'Steven M. Asmussen',
    runStyle: 'E3',
    daysOff: 62,
    avgSpeed: 81,
    bestSpeed: 89,
    backSpeed: 87,
    speedLR: 87,
    avgDistance: 81,
    primePower: 119.5,
    avgClass: 112.8,
    lastClass: 115,
    earlyPace1: 75,
    earlyPace2: 78,
    latePace: 85,
    jockeyWinPct: 0.111,
    trainerWinPct: 0.161,
    angles: 'Best Distance',
    scratched: false,
  },
  {
    postPosition: 4,
    programNumber: '13',
    horseName: 'Baytown Butterfly',
    morningLineOdds: '7/2',
    jockeyName: 'Abel Cedillo',
    trainerName: 'Peter Miller',
    runStyle: 'P8',
    daysOff: 29,
    avgSpeed: 46,
    bestSpeed: 53,
    backSpeed: null,
    speedLR: 77,
    avgDistance: 46,
    primePower: 120.3,
    avgClass: 113,
    lastClass: 113,
    earlyPace1: 74,
    earlyPace2: 66,
    latePace: 40,
    jockeyWinPct: 0.084,
    trainerWinPct: 0.163,
    angles: '',
    scratched: false,
  },
  {
    postPosition: 5,
    programNumber: '4/5',
    horseName: 'Cozy Curlin Kitten',
    morningLineOdds: '8/5',
    jockeyName: 'Jose L. Ortiz',
    trainerName: 'Eddie Kenneally',
    runStyle: 'S2',
    daysOff: 33,
    avgSpeed: 82,
    bestSpeed: null,
    backSpeed: 88,
    speedLR: 76,
    avgDistance: 82,
    primePower: 121.1,
    avgClass: 113.5,
    lastClass: 113,
    earlyPace1: 71,
    earlyPace2: 74,
    latePace: 91,
    jockeyWinPct: 0.216,
    trainerWinPct: 0.167,
    angles: 'Key Trainer',
    scratched: false,
  },
  {
    postPosition: 6,
    programNumber: '6',
    horseName: 'Barbratina',
    morningLineOdds: '4/1',
    jockeyName: 'Tyler Gaffalione',
    trainerName: 'Robert Medina',
    runStyle: 'S2',
    daysOff: 55,
    avgSpeed: 75,
    bestSpeed: 88,
    backSpeed: 75,
    speedLR: 75,
    avgDistance: 75,
    primePower: 112,
    avgClass: 108.1,
    lastClass: 111,
    earlyPace1: 61,
    earlyPace2: 65,
    latePace: 90,
    jockeyWinPct: 0.164,
    trainerWinPct: 0.108,
    angles: 'Hot Trainer,Combo',
    scratched: false,
  },
];

const res = await fetch(`${BASE}/api/races/${RACE1_ID}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ horses }),
});

const data = await res.json();

if (!res.ok) {
  console.error('ERROR:', data);
  process.exit(1);
}

console.log('Updated Race 1 — horses saved:');
for (const h of data.horses) {
  console.log(
    `  PP${h.postPosition} ${h.horseName.padEnd(22)} ` +
    `avgSpd=${h.avgSpeed ?? '--'} bestSpd=${h.bestSpeed ?? '--'} spd LR=${h.speedLR ?? '--'} ` +
    `primePwr=${h.primePower ?? '--'} avgCls=${h.avgClass ?? '--'} ` +
    `EP1=${h.earlyPace1 ?? '--'} EP2=${h.earlyPace2 ?? '--'} LP=${h.latePace ?? '--'} ` +
    `angles="${h.angles ?? ''}"`
  );
}
