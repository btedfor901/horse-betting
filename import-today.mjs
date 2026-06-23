// Churchill Downs June 19 2026 — full race card import
const BASE = 'https://horsesyndicate-production.up.railway.app';

async function post(url, body) {
  const r = await fetch(`${BASE}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(`POST ${url} failed: ${JSON.stringify(data)}`);
  return data;
}

async function put(url, body) {
  const r = await fetch(`${BASE}${url}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(`PUT ${url} failed: ${JSON.stringify(data)}`);
  return data;
}

const races = [
  {
    number: 1, postTime: '12:45 PM', distance: '1M', surface: 'dirt',
    raceType: 'claiming', purse: '$78,000',
    conditions: 'F&M, 4yo+, $40K Claiming, 1M Dirt',
    horses: [
      { postPosition: 1, horseName: 'Story Hour',        morningLineOdds: '15/1', jockeyName: 'Cristian A. Torres',        trainerName: 'Robert Medina' },
      { postPosition: 2, horseName: 'Musical Prayer',    morningLineOdds: '3/1',  jockeyName: 'Irad Ortiz, Jr.',           trainerName: 'Randy L. Morse' },
      { postPosition: 3, horseName: 'Bow Draw',          morningLineOdds: '6/1',  jockeyName: 'Keith J. Asmussen',         trainerName: 'Steven M. Asmussen' },
      { postPosition: 4, horseName: 'Baytown Butterfly', morningLineOdds: '7/2',  jockeyName: 'Abel Cedillo',              trainerName: 'Peter Miller' },
      { postPosition: 5, horseName: 'Cozy Curlin Kitten',morningLineOdds: '8/5',  jockeyName: 'Jose L. Ortiz',             trainerName: 'Eddie Kenneally' },
      { postPosition: 6, horseName: 'Barbratina',        morningLineOdds: '4/1',  jockeyName: 'Tyler Gaffalione',          trainerName: 'Robert Medina' },
    ],
  },
  {
    number: 2, postTime: '1:14 PM', distance: '1 1/16M', surface: 'dirt',
    raceType: 'claiming', purse: '$45,000',
    conditions: 'Open, 4yo+, $12.5K Claiming, 1 1/16M Dirt',
    horses: [
      { postPosition: 1, horseName: 'Nip N Tuck',         morningLineOdds: '4/1',  jockeyName: 'Danny Sheehy',              trainerName: 'Barry L. King' },
      { postPosition: 2, horseName: 'Saltwater Cowboy',   morningLineOdds: '3/1',  jockeyName: 'H. Luke Hoskins',           trainerName: 'John Alexander Ortiz' },
      { postPosition: 3, horseName: 'National Eclipse',   morningLineOdds: '5/2',  jockeyName: 'Luis Saez',                 trainerName: 'Eddie Kenneally' },
      { postPosition: 4, horseName: 'Ready to Pounce',    morningLineOdds: '8/1',  jockeyName: 'Ben Curtis',                trainerName: 'Anna M. Meah' },
      { postPosition: 5, horseName: 'Hoodlum',            morningLineOdds: '8/5',  jockeyName: 'Tyler Gaffalione',          trainerName: 'Norm W. Casse' },
      { postPosition: 6, horseName: 'Creek',              morningLineOdds: '20/1', jockeyName: 'Adam Beschizza',            trainerName: 'Matt Kordenbrock' },
    ],
  },
  {
    number: 3, postTime: '1:43 PM', distance: '5.5f', surface: 'turf',
    raceType: 'maiden-special-weight', purse: '$120,000',
    conditions: 'Fillies, 2yo, MSW, 5.5f Turf',
    horses: [
      { postPosition: 1,  horseName: 'Gone and Plenty',   morningLineOdds: '9/2',  jockeyName: 'Irad Ortiz, Jr.',           trainerName: 'Joe Sharp' },
      { postPosition: 2,  horseName: 'Spun Tight',        morningLineOdds: '6/1',  jockeyName: 'Jose L. Ortiz',             trainerName: 'Peter Miller' },
      { postPosition: 3,  horseName: 'Bit Tipsy',         morningLineOdds: '15/1', jockeyName: 'Jaime A. Torres',           trainerName: 'Eduardo Caramori' },
      { postPosition: 4,  horseName: 'Fashion Setter',    morningLineOdds: '10/1', jockeyName: 'Luis Saez',                 trainerName: 'Michael Ann Ewing' },
      { postPosition: 5,  horseName: 'Crack On',          morningLineOdds: '30/1', jockeyName: 'Danny Sheehy',              trainerName: 'Jimmy Corrigan' },
      { postPosition: 6,  horseName: 'Let Her Fly',       morningLineOdds: '6/1',  jockeyName: 'Rafael Bejarano',           trainerName: "Doug F. O'Neill" },
      { postPosition: 7,  horseName: 'Heart of a Gunner', morningLineOdds: '7/2',  jockeyName: 'Ben Curtis',                trainerName: 'Eddie Kenneally' },
      { postPosition: 8,  horseName: 'Fuego Sunset',      morningLineOdds: '20/1', jockeyName: 'Axel Concepcion',           trainerName: "Jose Francisco D'Angelo" },
      { postPosition: 9,  horseName: 'Bee Crazy',         morningLineOdds: '3/1',  jockeyName: 'Adam Beschizza',            trainerName: 'Kelsey Danner' },
      { postPosition: 10, horseName: 'Just You and Me',   morningLineOdds: '12/1', jockeyName: 'Mario Gutierrez',           trainerName: 'Victoria H. Oliver' },
      { postPosition: 11, horseName: 'Press Release',     morningLineOdds: '4/1',  jockeyName: 'Tyler Gaffalione',          trainerName: 'D. Whitworth Beckman' },
    ],
  },
  {
    number: 4, postTime: '2:13 PM', distance: '6f', surface: 'dirt',
    raceType: 'claiming', purse: '$76,000',
    conditions: 'Open, 3yo+, $50K Claiming, 6f Dirt',
    horses: [
      { postPosition: 1, horseName: 'Landing Craft',    morningLineOdds: '8/1',  jockeyName: 'Edgar Morales',             trainerName: 'Jordan Blair' },
      { postPosition: 2, horseName: 'Nash Potatoes',    morningLineOdds: '10/1', jockeyName: 'Gabriel Saez',              trainerName: 'J. Kent Sweezey' },
      { postPosition: 3, horseName: 'Royal Sapphire',   morningLineOdds: '12/1', jockeyName: 'Summer Pauly',              trainerName: 'Genaro Garcia' },
      { postPosition: 4, horseName: 'Vanderbilt',       morningLineOdds: '6/5',  jockeyName: 'Irad Ortiz, Jr.',           trainerName: 'Brad H. Cox' },
      { postPosition: 5, horseName: 'Spurgeon',         morningLineOdds: '20/1', jockeyName: 'Rafael Bejarano',           trainerName: 'Ed Moger, Jr.' },
      { postPosition: 6, horseName: 'Evan On Earth',    morningLineOdds: '7/2',  jockeyName: 'Tyler Gaffalione',          trainerName: 'Gregory D. Foley' },
      { postPosition: 7, horseName: 'Army Wildcatter',  morningLineOdds: '12/1', jockeyName: 'Alex Achard',               trainerName: 'John Ennis' },
      { postPosition: 8, horseName: 'Justifreak',       morningLineOdds: '9/2',  jockeyName: 'Jose L. Ortiz',             trainerName: 'Eddie Kenneally' },
    ],
  },
  {
    number: 5, postTime: '2:45 PM', distance: '5f', surface: 'dirt',
    raceType: 'maiden-special-weight', purse: '$92,000',
    conditions: 'Open, 2yo, MSW, 5f Dirt',
    horses: [
      { postPosition: 1,  horseName: 'Prairie Avenue',  morningLineOdds: '20/1', jockeyName: 'Joel Rosario',              trainerName: 'Lane D. Johnston' },
      { postPosition: 2,  horseName: 'Ditlihi',         morningLineOdds: '15/1', jockeyName: 'Danny Sheehy',              trainerName: 'John Ennis' },
      { postPosition: 3,  horseName: 'See You Soon',    morningLineOdds: '5/1',  jockeyName: 'Irad Ortiz, Jr.',           trainerName: 'Joe Sharp' },
      { postPosition: 4,  horseName: 'Karajan',         morningLineOdds: '8/1',  jockeyName: 'Martin Garcia',             trainerName: 'Dale L. Romans' },
      { postPosition: 5,  horseName: 'Trim Castle',     morningLineOdds: '3/1',  jockeyName: 'Tyler Gaffalione',          trainerName: 'John Ennis' },
      { postPosition: 6,  horseName: 'Baytown Theo',    morningLineOdds: '10/1', jockeyName: 'Agustin Gomez',             trainerName: 'Paul McEntee' },
      { postPosition: 7,  horseName: 'King Crusher',    morningLineOdds: '12/1', jockeyName: 'Adam Beschizza',            trainerName: 'George Weaver' },
      { postPosition: 8,  horseName: 'Cold Kiss',       morningLineOdds: '10/1', jockeyName: 'Edgar Morales',             trainerName: 'Michael J. Maker' },
      { postPosition: 9,  horseName: 'Bourbon Town',    morningLineOdds: '6/1',  jockeyName: 'Luis Saez',                 trainerName: 'Rey Hernandez' },
      { postPosition: 10, horseName: 'Bomani',          morningLineOdds: '20/1', jockeyName: 'Mario Gutierrez',           trainerName: 'Pavel Matejka' },
      { postPosition: 11, horseName: 'Crossfire',       morningLineOdds: '4/1',  jockeyName: 'Jose L. Ortiz',             trainerName: 'Brendan P. Walsh' },
    ],
  },
  {
    number: 6, postTime: '3:18 PM', distance: '1 1/16M', surface: 'turf',
    raceType: 'optional-claiming', purse: '$148,000',
    conditions: 'Open, 3yo+, $175K AOC, 1 1/16M Turf',
    horses: [
      { postPosition: 1, horseName: 'Lambeth',             morningLineOdds: '9/2',  jockeyName: 'Jose L. Ortiz',             trainerName: 'Joe Sharp' },
      { postPosition: 2, horseName: 'Higgins Boat',        morningLineOdds: '20/1', jockeyName: 'Jaime A. Torres',           trainerName: 'John Alexander Ortiz' },
      { postPosition: 3, horseName: 'Awesome Aaron',       morningLineOdds: '15/1', jockeyName: 'Luis Saez',                 trainerName: 'Norm W. Casse' },
      { postPosition: 4, horseName: 'Irish Aces',          morningLineOdds: '7/2',  jockeyName: 'Tyler Gaffalione',          trainerName: 'Brendan P. Walsh' },
      { postPosition: 5, horseName: 'Funtastic Again',     morningLineOdds: '5/1',  jockeyName: 'Florent Geroux',            trainerName: 'Wesley A. Ward' },
      { postPosition: 6, horseName: 'Idratherbeblessed',   morningLineOdds: '10/1', jockeyName: 'Joel Rosario',              trainerName: 'Michael J. Maker' },
      { postPosition: 7, horseName: 'Herchee',             morningLineOdds: '8/1',  jockeyName: 'Edgar Morales',             trainerName: 'Helen Pitts' },
      { postPosition: 8, horseName: 'West Hollywood',      morningLineOdds: '2/1',  jockeyName: 'Irad Ortiz, Jr.',           trainerName: 'Brad H. Cox' },
      { postPosition: 9, horseName: 'Theismann',           morningLineOdds: '15/1', jockeyName: 'Danny Sheehy',              trainerName: 'Peter Eurton' },
    ],
  },
  {
    number: 7, postTime: '3:50 PM', distance: '6.5f', surface: 'dirt',
    raceType: 'claiming', purse: '$50,000',
    conditions: 'Open, 3yo+, $20K Claiming, 6.5f Dirt',
    horses: [
      { postPosition: 1, horseName: 'Mamoot',           morningLineOdds: '15/1', jockeyName: 'Alex Achard',               trainerName: 'Miguel Angel Silva' },
      { postPosition: 2, horseName: 'League of Legends',morningLineOdds: '8/1',  jockeyName: 'Francisco Arrieta',         trainerName: 'Randy L. Morse' },
      { postPosition: 3, horseName: 'Stormy At Midnight',morningLineOdds: '10/1',jockeyName: 'Emmanuel Esquivel',         trainerName: 'Miguel Angel Silva' },
      { postPosition: 4, horseName: 'Guardian',         morningLineOdds: '3/1',  jockeyName: 'Irad Ortiz, Jr.',           trainerName: 'David Jacobson' },
      { postPosition: 5, horseName: 'Mischief Mania',   morningLineOdds: '6/1',  jockeyName: 'Jose L. Ortiz',             trainerName: 'Linda Rice' },
      { postPosition: 6, horseName: 'Forty Love',       morningLineOdds: '5/1',  jockeyName: 'Tyler Gaffalione',          trainerName: 'Sandino R. Hernandez, Jr.' },
      { postPosition: 7, horseName: 'Coastal Breeze',   morningLineOdds: '9/2',  jockeyName: 'Luis Saez',                 trainerName: 'Matt A. Shirer' },
      { postPosition: 8, horseName: "Mitty's Griddy",   morningLineOdds: '7/2',  jockeyName: 'Edgar Morales',             trainerName: 'Chris A. Hartman' },
      { postPosition: 9, horseName: 'Livehappy',        morningLineOdds: '20/1', jockeyName: 'Gerardo Corrales',          trainerName: 'Tito Moreno' },
    ],
  },
  {
    number: 8, postTime: '4:22 PM', distance: '6f', surface: 'dirt',
    raceType: 'optional-claiming', purse: '$141,000',
    conditions: 'F&M, 3yo+, $100K AOC, 6f Dirt',
    horses: [
      { postPosition: 1, horseName: 'City Scene',    morningLineOdds: '20/1', jockeyName: 'Luis Raul Rivera',            trainerName: 'James R. Jackson' },
      { postPosition: 2, horseName: 'Tapit Quick',   morningLineOdds: '8/1',  jockeyName: 'Brian Joseph Hernandez, Jr.', trainerName: 'Dallas Stewart' },
      { postPosition: 3, horseName: 'Silent Law',    morningLineOdds: '4/1',  jockeyName: 'Martin Garcia',               trainerName: 'Bob Baffert' },
      { postPosition: 4, horseName: 'Roswell',       morningLineOdds: '7/2',  jockeyName: 'Irad Ortiz, Jr.',             trainerName: 'William I. Mott' },
      { postPosition: 5, horseName: 'Anakarina',     morningLineOdds: '5/2',  jockeyName: 'Erik Asmussen',               trainerName: 'Dallas Stewart' },
      { postPosition: 6, horseName: 'Cash Call',     morningLineOdds: '8/5',  jockeyName: 'Florent Geroux',              trainerName: 'Bob Baffert' },
    ],
  },
  {
    number: 9, postTime: '4:55 PM', distance: '1 1/8M', surface: 'turf',
    raceType: 'allowance', purse: '$127,000',
    conditions: 'F&M, 3yo+, Allowance, 1 1/8M Turf',
    horses: [
      { postPosition: 1, horseName: 'Pookie',              morningLineOdds: '10/1', jockeyName: 'Brian Joseph Hernandez, Jr.', trainerName: 'Ian R. Wilkes' },
      { postPosition: 2, horseName: 'Jerseys Parade',       morningLineOdds: '30/1', jockeyName: 'Gabriel Saez',               trainerName: 'Charles Meredith' },
      { postPosition: 3, horseName: 'Smokin Hot Blonde',    morningLineOdds: '30/1', jockeyName: 'Luis Contreras',             trainerName: 'James A. Kelley' },
      { postPosition: 4, horseName: 'Sunshine Daydream',    morningLineOdds: '12/1', jockeyName: 'Ben Curtis',                 trainerName: 'Joe Sharp' },
      { postPosition: 5, horseName: 'Ensorcell',            morningLineOdds: '20/1', jockeyName: 'Rafael Bejarano',            trainerName: 'Ron Moquett' },
      { postPosition: 6, horseName: 'Competitive Market',   morningLineOdds: '9/5',  jockeyName: 'Tyler Gaffalione',           trainerName: 'Chad C. Brown' },
      { postPosition: 7, horseName: 'La Cantera (IRE)',     morningLineOdds: '6/1',  jockeyName: 'Luis Saez',                  trainerName: 'Carlos A. David' },
      { postPosition: 8, horseName: 'Miss Pharaoh',         morningLineOdds: '4/1',  jockeyName: 'Mario Gutierrez',            trainerName: 'Matthew P. Sims' },
      { postPosition: 9, horseName: 'Amberglen (IRE)',      morningLineOdds: '5/2',  jockeyName: 'Irad Ortiz, Jr.',            trainerName: 'Brad H. Cox' },
    ],
  },
];

async function main() {
  console.log('Creating race day: June 19 2026 — Churchill Downs');
  const day = await post('/api/race-days', { date: '2026-06-19', track: 'Churchill Downs' });
  console.log(`  Race day ID: ${day.id}`);

  for (const raceData of races) {
    const { horses, ...raceFields } = raceData;
    console.log(`\nCreating Race ${raceFields.number} (${raceFields.postTime}) — ${raceFields.distance} ${raceFields.surface}...`);
    const race = await post('/api/races', { raceDayId: day.id, ...raceFields });
    console.log(`  Race ID: ${race.id}`);

    console.log(`  Adding ${horses.length} horses...`);
    const created = await put(`/api/races/${race.id}/horses`, horses);
    console.log(`  ✓ ${created.length} horses saved`);
  }

  console.log('\n✅ All 9 races imported. Visit the dashboard or import page to view.');
  console.log(`   Race Day ID: ${(await fetch(`${BASE}/api/race-days`).then(r => r.json()))[0]?.id}`);
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
