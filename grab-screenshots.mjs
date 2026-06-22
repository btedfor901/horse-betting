/**
 * TwinSpires Race Card Screenshot Capture + Auto Data Extraction
 *
 * 1. Navigates Today's Races for each American track
 * 2. Screenshots every race × tab (Advanced, Speed, Class, Pace, Tips)
 * 3. Uploads screenshots to Cloudflare R2
 * 4. Uses Claude Vision to extract horse data from the screenshots
 * 5. Creates race day + races + horses in the Railway app automatically
 *
 * Usage: node grab-screenshots.mjs [--tracks '["Track Name"]'] [--date YYYY-MM-DD] [--live]
 */

import { chromium } from 'playwright';
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import Anthropic from '@anthropic-ai/sdk';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, 'betting-app', '.env') });

// ── Cloudflare R2 ─────────────────────────────────────────────────────────────
const r2 = (process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID)
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    })
  : null;

// ── Claude Vision client ──────────────────────────────────────────────────────
const claude = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = flag => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };
const LIVE_ONLY = args.includes('--live');

const TODAY = getArg('--date') ?? new Date().toLocaleDateString('en-CA');
const SCREENSHOT_BASE = path.join(__dirname, 'betting-app', 'public', 'screenshots', TODAY);
const MAX_RACES = 14;

// ── American tracks ───────────────────────────────────────────────────────────
const ALL_TRACKS = [
  { name: 'Churchill Downs',        match: /churchill/i },
  { name: 'Horseshoe Indianapolis', match: /horseshoe\s+indianapolis/i },
  { name: 'Oak Grove',              match: /oak\s+grove/i },
  { name: 'Presque Isle',           match: /presque/i },
  { name: 'Louisiana Downs',        match: /louisiana.?downs/i },
  { name: 'Gulfstream Park',        match: /gulfstream/i },
  { name: 'Santa Anita Park',       match: /santa\s+anita/i },
  { name: 'Keeneland',              match: /keeneland/i },
  { name: 'Saratoga',               match: /saratoga/i },
  { name: 'Belmont Park',           match: /belmont/i },
  { name: 'Aqueduct',               match: /aqueduct/i },
  { name: 'Monmouth Park',          match: /monmouth/i },
  { name: 'Parx Racing',            match: /parx/i },
  { name: 'Turfway Park',           match: /turfway/i },
  { name: 'Fair Grounds',           match: /fair\s+grounds/i },
  { name: 'Del Mar',                match: /del\s+mar/i },
  { name: 'Laurel Park',            match: /laurel/i },
  { name: 'Charles Town',           match: /charles\s+town/i },
  { name: 'Mountaineer Park',       match: /mountaineer/i },
  { name: 'Evangeline Downs',       match: /evangeline/i },
  { name: 'Delta Downs',            match: /delta\s+downs/i },
];

const cliTracksArg = getArg('--tracks');
const selectedNames = cliTracksArg ? JSON.parse(cliTracksArg) : null;
const TRACKS = selectedNames
  ? ALL_TRACKS.filter(t => selectedNames.includes(t.name))
  : ALL_TRACKS;

const TABS = LIVE_ONLY ? ['advanced'] : ['advanced', 'speed', 'class', 'pace', 'tips'];

// ── Helpers ───────────────────────────────────────────────────────────────────
function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function saveDir(trackName, raceNum) {
  const dir = path.join(SCREENSHOT_BASE, slugify(trackName), `race-${raceNum}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function urlForRace(baseUrl, raceNum) {
  return baseUrl.replace(/\/(\w+)\/(\w+)$/, `/${raceNum}/$2`);
}

function urlForTab(baseUrl, tab) {
  return baseUrl.replace(/\/(\w+)$/, `/${tab}`);
}

function readImgBase64(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath).toString('base64');
}

function parseJSON(text, fallback) {
  try {
    const match = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
    return match ? JSON.parse(match[0]) : fallback;
  } catch {
    return fallback;
  }
}

// ── R2 upload / cleanup ───────────────────────────────────────────────────────
async function uploadToR2(localPath, r2Key) {
  if (!r2 || !process.env.R2_BUCKET_NAME) return;
  try {
    await r2.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: r2Key,
      Body: fs.createReadStream(localPath),
      ContentType: 'image/png',
    }));
  } catch (e) {
    console.warn(`    R2 upload failed: ${e.message}`);
  }
}

async function cleanupPreviousDayR2() {
  if (!r2 || !process.env.R2_BUCKET_NAME) return;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yDate = yesterday.toLocaleDateString('en-CA');
  console.log(`\nCleaning up R2 for ${yDate}...`);
  try {
    const listed = await r2.send(new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME,
      Prefix: `screenshots/${yDate}/`,
    }));
    if (!listed.Contents?.length) { console.log('  Nothing to clean up.'); return; }
    await r2.send(new DeleteObjectsCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Delete: { Objects: listed.Contents.map(o => ({ Key: o.Key })), Quiet: true },
    }));
    console.log(`  Deleted ${listed.Contents.length} file(s)`);
  } catch (e) {
    console.warn(`  R2 cleanup failed: ${e.message}`);
  }
}

// ── Railway API helpers ───────────────────────────────────────────────────────
async function createRaceDayInApp(date, trackName) {
  const appUrl = process.env.RAILWAY_APP_URL;
  if (!appUrl) return null;
  try {
    const res = await fetch(`${appUrl}/api/race-days`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, track: trackName }),
    });
    if (res.ok) {
      const data = await res.json();
      console.log(`  ✓ Race day ready: ${trackName} (${data.id})`);
      return data.id;
    }
  } catch (e) {
    console.warn(`  Race day creation failed: ${e.message}`);
  }
  return null;
}

async function createRaceInApp(raceDayId, raceNum, distance, surface, raceType) {
  const appUrl = process.env.RAILWAY_APP_URL;
  if (!appUrl || !raceDayId) return null;
  try {
    const res = await fetch(`${appUrl}/api/races`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raceDayId, number: raceNum, distance, surface, raceType }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.id;
    }
  } catch (e) {
    console.warn(`    Race creation failed: ${e.message}`);
  }
  return null;
}

async function saveHorsesToApp(raceId, horses) {
  const appUrl = process.env.RAILWAY_APP_URL;
  if (!appUrl || !raceId || !horses.length) return;
  try {
    const res = await fetch(`${appUrl}/api/races/${raceId}/horses`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(horses),
    });
    if (!res.ok) console.warn(`    Horse save returned ${res.status}`);
  } catch (e) {
    console.warn(`    Horse save failed: ${e.message}`);
  }
}

// ── Claude Vision extraction ───────────────────────────────────────────────────
async function extractRaceData(raceDir, raceNum) {
  if (!claude) {
    console.log('    (Skipping extraction — no ANTHROPIC_API_KEY)');
    return null;
  }

  const img = tab => {
    const b64 = readImgBase64(path.join(raceDir, `${tab}.png`));
    if (!b64) return null;
    return { type: 'image', source: { type: 'base64', media_type: 'image/png', data: b64 } };
  };

  // ── Advanced tab: race metadata + horse basics ───────────────────────────
  const advImg = img('advanced');
  if (!advImg) return null;

  console.log(`    Extracting race data via Claude...`);
  const advMsg = await claude.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 3000,
    messages: [{
      role: 'user',
      content: [
        advImg,
        {
          type: 'text',
          text: `This is a TwinSpires horse racing program card (Advanced tab) for Race ${raceNum}.
Extract the race info and all horse entries. Return ONLY valid JSON with this exact structure:
{
  "distance": "6f",
  "surface": "dirt",
  "raceType": "claiming",
  "horses": [
    {
      "postPosition": 1,
      "horseName": "Horse Name Here",
      "morningLineOdds": "8/5",
      "jockeyName": "Smith, John",
      "jockeyWinPct": 20,
      "trainerName": "Jones, Bob",
      "trainerWinPct": 15,
      "daysOff": 14
    }
  ]
}
Rules:
- surface must be one of: dirt, turf, synthetic
- raceType must be one of: claiming, maiden, maiden-claiming, allowance, stakes, handicap, optional-claiming
- distance examples: "6f", "1M", "1 1/16M", "5 1/2f"
- morningLineOdds format: "8/5", "5/2", "12/1", "3/5"
- jockeyWinPct and trainerWinPct are numbers (e.g. 20 for 20%)
- daysOff is an integer (days since last race), null if first start
- Include ALL horses shown even if some fields are missing
- Return ONLY the JSON, no explanation`,
        },
      ],
    }],
  });

  const advText = advMsg.content[0]?.text ?? '';
  const advData = parseJSON(advText, {});
  const horses = Array.isArray(advData.horses) ? advData.horses : [];
  if (!horses.length) {
    console.warn('    Claude returned no horses from advanced tab');
    return null;
  }

  // ── Speed tab: speed figures ─────────────────────────────────────────────
  const spdImg = img('speed');
  if (spdImg) {
    const spdMsg = await claude.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          spdImg,
          {
            type: 'text',
            text: `This is a TwinSpires Speed tab for Race ${raceNum}.
Extract speed figures for every horse. Return ONLY a JSON array:
[{"horseName":"Name","bestSpeed":95,"backSpeed":88,"speedLR":90,"avgSpeed":87}]
- All values are numbers. Use null if not shown (e.g. first-time starter).
- horseName must match exactly as shown on the card.
- Return ONLY the JSON array, no explanation.`,
          },
        ],
      }],
    });
    const spdData = parseJSON(spdMsg.content[0]?.text ?? '', []);
    for (const s of spdData) {
      const h = horses.find(h => h.horseName === s.horseName);
      if (h) Object.assign(h, { bestSpeed: s.bestSpeed, backSpeed: s.backSpeed, speedLR: s.speedLR, avgSpeed: s.avgSpeed });
    }
  }

  // ── Class tab: class ratings ─────────────────────────────────────────────
  const clsImg = img('class');
  if (clsImg) {
    const clsMsg = await claude.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          clsImg,
          {
            type: 'text',
            text: `This is a TwinSpires Class tab for Race ${raceNum}.
Extract class ratings for every horse. Return ONLY a JSON array:
[{"horseName":"Name","primePower":145.2,"avgClass":95,"lastClass":100}]
- All values are numbers. Use null if not shown.
- Return ONLY the JSON array, no explanation.`,
          },
        ],
      }],
    });
    const clsData = parseJSON(clsMsg.content[0]?.text ?? '', []);
    for (const c of clsData) {
      const h = horses.find(h => h.horseName === c.horseName);
      if (h) Object.assign(h, { primePower: c.primePower, avgClass: c.avgClass, lastClass: c.lastClass });
    }
  }

  // ── Pace tab: pace figures ────────────────────────────────────────────────
  const paceImg = img('pace');
  if (paceImg) {
    const paceMsg = await claude.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          paceImg,
          {
            type: 'text',
            text: `This is a TwinSpires Pace tab for Race ${raceNum}.
Extract pace figures for every horse. Return ONLY a JSON array:
[{"horseName":"Name","earlyPace1":45.2,"earlyPace2":47.8,"latePace":35.4,"avgDistance":null}]
- All values are numbers. Use null if not shown.
- Return ONLY the JSON array, no explanation.`,
          },
        ],
      }],
    });
    const paceData = parseJSON(paceMsg.content[0]?.text ?? '', []);
    for (const p of paceData) {
      const h = horses.find(h => h.horseName === p.horseName);
      if (h) Object.assign(h, { earlyPace1: p.earlyPace1, earlyPace2: p.earlyPace2, latePace: p.latePace, avgDistance: p.avgDistance });
    }
  }

  return {
    distance: advData.distance || 'Unknown',
    surface: advData.surface || 'dirt',
    raceType: advData.raceType || 'claiming',
    horses,
  };
}

// ── Browser navigation ────────────────────────────────────────────────────────
async function findTrackBaseUrl(page, track) {
  console.log(`\n[Track] ${track.name} — clicking Today's Races entry...`);
  await page.goto('https://www.twinspires.com/bet/todays-races/time', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1500);

  const trackRow = page.locator('.track-group-container-col, .track-race-info, cdux-track-group')
    .filter({ hasText: track.match }).first();

  if (!await trackRow.count()) {
    console.warn(`  "${track.name}" not found on Today's Races.`);
    await page.screenshot({ path: path.join(SCREENSHOT_BASE, `_debug-${slugify(track.name)}.png`), fullPage: true });
    return null;
  }

  await trackRow.click({ force: true });
  await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(1500);

  let url = page.url();
  url = url.replace(/\/(\d+)\/\w+$/, '/1/advanced');
  if (!url.includes('/advanced')) url = url.replace(/\/$/, '') + '/1/advanced';
  console.log(`  Base URL: ${url}`);
  return url;
}

async function captureTab(page, url, filePath, r2Key) {
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    if (resp && resp.status() === 404) return false;
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(900);
    await page.screenshot({ path: filePath, fullPage: false });
    await uploadToR2(filePath, r2Key);
    return true;
  } catch {
    return false;
  }
}

async function captureTrack(page, track) {
  const baseUrl = await findTrackBaseUrl(page, track);
  if (!baseUrl) return;

  // Probe how many races exist
  const racesToCapture = [];
  for (let r = 1; r <= MAX_RACES; r++) {
    const testUrl = urlForTab(urlForRace(baseUrl, r), 'advanced');
    const resp = await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 12000 });
    if (!resp || resp.status() === 404) { console.log(`  Race ${r} → 404, stopping.`); break; }
    const finalUrl = page.url();
    if (r > 1 && finalUrl === urlForTab(urlForRace(baseUrl, 1), 'advanced')) {
      console.log(`  Race ${r} redirected to Race 1 — stopping.`);
      break;
    }
    racesToCapture.push(r);
  }

  console.log(`  Races found: ${racesToCapture.join(', ')}`);
  if (!racesToCapture.length) return;

  const raceDayId = await createRaceDayInApp(TODAY, track.name);

  for (const raceNum of racesToCapture) {
    console.log(`\n  [Race ${raceNum}]`);
    const dir = saveDir(track.name, raceNum);

    // Capture all tabs
    for (const tab of TABS) {
      const tabUrl = urlForTab(urlForRace(baseUrl, raceNum), tab);
      const filePath = path.join(dir, `${tab}.png`);
      const r2Key = `screenshots/${TODAY}/${slugify(track.name)}/race-${raceNum}/${tab}.png`;
      const ok = await captureTab(page, tabUrl, filePath, r2Key);
      console.log(ok ? `    ✓ ${tab}.png${r2 ? ' → R2' : ''}` : `    – ${tab} not available`);
    }

    // Skip extraction in live mode (just updating odds screenshots)
    if (LIVE_ONLY) continue;

    // Extract race data from screenshots via Claude and save to app
    const raceData = await extractRaceData(dir, raceNum);
    if (raceData && raceDayId) {
      const raceId = await createRaceInApp(raceDayId, raceNum, raceData.distance, raceData.surface, raceData.raceType);
      if (raceId) {
        await saveHorsesToApp(raceId, raceData.horses);
        console.log(`    ✓ Race ${raceNum} created with ${raceData.horses.length} horses`);
      }
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\nTwinSpires Screenshot Capture — ${TODAY}`);
  console.log(`Tracks: ${TRACKS.map(t => t.name).join(', ')}`);
  console.log(`Tabs:   ${TABS.join(', ')}`);
  console.log(`Claude: ${claude ? 'enabled' : 'disabled (set ANTHROPIC_API_KEY)'}`);
  console.log(`Output: ${SCREENSHOT_BASE}\n`);

  fs.mkdirSync(SCREENSHOT_BASE, { recursive: true });

  const isCI = !!process.env.CI;
  const browser = await chromium.launch({ headless: isCI, slowMo: isCI ? 0 : 100 });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.goto('https://www.twinspires.com/bet/todays-races/time', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForTimeout(1500);
  await page.locator('button:has-text("I Understand"), button:has-text("Accept All"), button:has-text("Accept")')
    .first().click({ timeout: 5000 }).catch(() => {});

  try {
    for (const track of TRACKS) {
      await captureTrack(page, track);
    }
    await cleanupPreviousDayR2();
    console.log('\n✓ All done!');
  } catch (err) {
    console.error('\nFatal error:', err.message);
    await page.screenshot({ path: path.join(SCREENSHOT_BASE, '_debug-error.png') }).catch(() => {});
  } finally {
    await browser.close();
  }
}

main();
