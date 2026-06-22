/**
 * Backfill horse data for today's already-captured screenshots.
 * Run this whenever extraction failed but screenshots exist locally.
 * Usage: node backfill-today.mjs [trackSlug]
 *   e.g. node backfill-today.mjs horseshoe-indianapolis
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, 'betting-app', '.env') });

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const APP_URL = process.env.RAILWAY_APP_URL;
const TODAY = new Date().toLocaleDateString('en-CA');
const SCREENSHOTS_BASE = path.join(__dirname, 'betting-app', 'public', 'screenshots', TODAY);

const trackFilter = process.argv.find(a => !a.startsWith('--') && a !== process.argv[0] && a !== process.argv[1]) ?? null;
const FORCE = process.argv.includes('--force');

function readImgBase64(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath).toString('base64');
}

function parseJSON(text, fallback) {
  try {
    const match = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
    return match ? JSON.parse(match[0]) : fallback;
  } catch { return fallback; }
}

async function extractFromScreenshots(raceDir, raceNum) {
  const img = tab => {
    const b64 = readImgBase64(path.join(raceDir, `${tab}.png`));
    if (!b64) return null;
    return { type: 'image', source: { type: 'base64', media_type: 'image/png', data: b64 } };
  };

  const advImg = img('advanced');
  if (!advImg) { console.log(`    No advanced.png â€” skipping`); return null; }

  const advMsg = await claude.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 3000,
    messages: [{
      role: 'user',
      content: [
        advImg,
        { type: 'text', text: `This is a TwinSpires horse racing program card (Advanced tab) for Race ${raceNum}.
Extract the race info and all horse entries. Return ONLY valid JSON:
{
  "distance": "6f",
  "surface": "dirt",
  "raceType": "claiming",
  "horses": [
    { "postPosition": 1, "horseName": "Name", "morningLineOdds": "8/5", "jockeyName": "Smith, John", "jockeyWinPct": 20, "trainerName": "Jones, Bob", "trainerWinPct": 15, "daysOff": 14 }
  ]
}
surface: dirt|turf|synthetic  raceType: claiming|maiden|maiden-claiming|allowance|stakes|handicap|optional-claiming
Return ONLY the JSON.` },
      ],
    }],
  });

  const advData = parseJSON(advMsg.content[0]?.text ?? '', {});
  const horses = Array.isArray(advData.horses) ? advData.horses : [];
  if (!horses.length) { console.log(`    Claude returned 0 horses`); return null; }

  // Speed
  const spdImg = img('speed');
  if (spdImg) {
    const r = await claude.messages.create({
      model: 'claude-haiku-4-5-20251001', max_tokens: 2000,
      messages: [{ role: 'user', content: [spdImg, { type: 'text', text: `Speed tab Race ${raceNum}. Return ONLY JSON array: [{"horseName":"Name","bestSpeed":95,"backSpeed":88,"speedLR":90,"avgSpeed":87}]. Null if not shown.` }] }],
    });
    for (const s of parseJSON(r.content[0]?.text ?? '', [])) {
      const h = horses.find(h => h.horseName === s.horseName);
      if (h) Object.assign(h, { bestSpeed: s.bestSpeed, backSpeed: s.backSpeed, speedLR: s.speedLR, avgSpeed: s.avgSpeed });
    }
  }

  // Class
  const clsImg = img('class');
  if (clsImg) {
    const r = await claude.messages.create({
      model: 'claude-haiku-4-5-20251001', max_tokens: 2000,
      messages: [{ role: 'user', content: [clsImg, { type: 'text', text: `Class tab Race ${raceNum}. Return ONLY JSON array: [{"horseName":"Name","primePower":145.2,"avgClass":95,"lastClass":100}]. Null if not shown.` }] }],
    });
    for (const c of parseJSON(r.content[0]?.text ?? '', [])) {
      const h = horses.find(h => h.horseName === c.horseName);
      if (h) Object.assign(h, { primePower: c.primePower, avgClass: c.avgClass, lastClass: c.lastClass });
    }
  }

  // Pace
  const paceImg = img('pace');
  if (paceImg) {
    const r = await claude.messages.create({
      model: 'claude-haiku-4-5-20251001', max_tokens: 2000,
      messages: [{ role: 'user', content: [paceImg, { type: 'text', text: `Pace tab Race ${raceNum}. Return ONLY JSON array: [{"horseName":"Name","earlyPace1":45.2,"earlyPace2":47.8,"latePace":35.4,"avgDistance":null}]. Null if not shown.` }] }],
    });
    for (const p of parseJSON(r.content[0]?.text ?? '', [])) {
      const h = horses.find(h => h.horseName === p.horseName);
      if (h) Object.assign(h, { earlyPace1: p.earlyPace1, earlyPace2: p.earlyPace2, latePace: p.latePace, avgDistance: p.avgDistance });
    }
  }

  // Summary â€” run style
  const sumImg = img('summary');
  if (sumImg) {
    const r = await claude.messages.create({
      model: 'claude-haiku-4-5-20251001', max_tokens: 2000,
      messages: [{ role: 'user', content: [sumImg, { type: 'text', text: `Summary tab Race ${raceNum}. Extract Run Style for every horse. Return ONLY JSON array: [{"horseName":"Name","runStyle":"E"}]. runStyle: E, P, S, or C (first letter only from codes like E1, P2, S0). Return ONLY the JSON array.` }] }],
    });
    for (const s of parseJSON(r.content[0]?.text ?? '', [])) {
      const h = horses.find(h => h.horseName === s.horseName);
      if (h && s.runStyle) h.runStyle = s.runStyle;
    }
  }

  // Tips â€” angles
  const tipsImg = img('tips');
  if (tipsImg) {
    const r = await claude.messages.create({
      model: 'claude-haiku-4-5-20251001', max_tokens: 2000,
      messages: [{ role: 'user', content: [tipsImg, { type: 'text', text: `Tips tab Race ${raceNum}. Extract the Angles column for every horse. Return ONLY JSON array: [{"horseName":"Name","angles":"Hot Jockey, Key Trainer"}]. If no angles, use null. Return ONLY the JSON array.` }] }],
    });
    for (const t of parseJSON(r.content[0]?.text ?? '', [])) {
      const h = horses.find(h => h.horseName === t.horseName);
      if (h && t.angles) h.angles = t.angles;
    }
  }

  return { distance: advData.distance || 'Unknown', surface: advData.surface || 'dirt', raceType: advData.raceType || 'claiming', horses };
}

// Get today's race days + races from Railway
const res = await fetch(`${APP_URL}/api/race-days?date=${TODAY}`);
const raceDays = await res.json();

const targets = Array.isArray(raceDays)
  ? raceDays.filter(rd => !trackFilter || rd.track.toLowerCase().replace(/[^a-z0-9]+/g, '-').includes(trackFilter))
  : [];

if (!targets.length) {
  console.log(`No race days found for ${TODAY}${trackFilter ? ` matching "${trackFilter}"` : ''}`);
  process.exit(0);
}

for (const raceDay of targets) {
  const trackSlug = raceDay.track.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const trackDir = path.join(SCREENSHOTS_BASE, trackSlug);
  console.log(`\n=== ${raceDay.track} (${raceDay.races.length} races in DB) ===`);

  if (!fs.existsSync(trackDir)) {
    console.log(`  No local screenshots at ${trackDir}`);
    continue;
  }

  // Build map of what's already in the DB
  const dbRaces = new Map(raceDay.races.map(r => [r.number, r]));

  // Discover all race folders on disk
  const localRaceNums = fs.readdirSync(trackDir)
    .filter(d => /^race-\d+$/.test(d))
    .map(d => parseInt(d.replace('race-', ''), 10))
    .sort((a, b) => a - b);

  console.log(`  Local race folders: ${localRaceNums.join(', ')}`);

  for (const raceNum of localRaceNums) {
    const raceDir = path.join(trackDir, `race-${raceNum}`);
    const existing = dbRaces.get(raceNum);
    const hasHorses = existing?.horses?.length > 0;

    if (hasHorses && !FORCE) {
      console.log(`  Race ${raceNum}: already has ${existing.horses.length} horses — skipping`);
      continue;
    }

    console.log(`  Race ${raceNum}: extracting...`);
    try {
      const data = await extractFromScreenshots(raceDir, raceNum);
      if (!data) continue;

      // Upsert race (creates if missing, updates if exists)
      const raceRes = await fetch(`${APP_URL}/api/races`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raceDayId: raceDay.id, number: raceNum, distance: data.distance, surface: data.surface, raceType: data.raceType }),
      });
      if (!raceRes.ok) { console.log(`  Race ${raceNum}: failed to upsert race (${raceRes.status})`); continue; }
      const raceObj = await raceRes.json();

      // Save horses
      const hr = await fetch(`${APP_URL}/api/races/${raceObj.id}/horses`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.horses),
      });
      if (hr.ok) {
        console.log(`  Race ${raceNum}: âœ“ saved ${data.horses.length} horses (${data.distance} ${data.surface} ${data.raceType})`);
      } else {
        console.log(`  Race ${raceNum}: horse save failed (${hr.status})`);
      }
    } catch (e) {
      console.error(`  Race ${raceNum}: error â€” ${e.message}`);
    }
  }
}

console.log('\nDone.');

