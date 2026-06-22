/**
 * TwinSpires Race Card Screenshot Capture
 * Usage: node grab-screenshots.mjs
 *
 * Navigates Today's Races, finds the track URL, then iterates all
 * races and tabs via URL pattern:
 *   /bet/program/classic/[track-slug]/[code]/[type]/[race-num]/[tab]
 *
 * Screenshots saved to:
 *   betting-app/public/screenshots/YYYY-MM-DD/[track-slug]/race-[N]/[tab].png
 */

import { chromium } from 'playwright';
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load env from betting-app/.env (where R2 credentials live)
dotenv.config({ path: path.join(__dirname, 'betting-app', '.env') });

// Cloudflare R2 client — only active when credentials are present
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
    console.warn(`    R2 upload failed for ${r2Key}: ${e.message}`);
  }
}

async function cleanupPreviousDayR2() {
  if (!r2 || !process.env.R2_BUCKET_NAME) return;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yDate = yesterday.toLocaleDateString('en-CA');
  const prefix = `screenshots/${yDate}/`;
  console.log(`\nCleaning up R2 for ${yDate}...`);
  try {
    const listed = await r2.send(new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME,
      Prefix: prefix,
    }));
    if (!listed.Contents || listed.Contents.length === 0) {
      console.log(`  No files found for ${yDate}`);
      return;
    }
    await r2.send(new DeleteObjectsCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Delete: {
        Objects: listed.Contents.map(obj => ({ Key: obj.Key })),
        Quiet: true,
      },
    }));
    console.log(`  Deleted ${listed.Contents.length} file(s) from ${yDate}`);
  } catch (e) {
    console.warn(`  R2 cleanup failed: ${e.message}`);
  }
}

async function createRaceDayInApp(date, trackName) {
  const appUrl = process.env.RAILWAY_APP_URL;
  if (!appUrl) return;
  try {
    const res = await fetch(`${appUrl}/api/race-days`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, track: trackName }),
    });
    if (res.ok) console.log(`  ✓ Race day created in app for ${trackName}`);
    else console.warn(`  Race day creation returned ${res.status}`);
  } catch (e) {
    console.warn(`  Race day creation failed: ${e.message}`);
  }
}

// --- CLI argument parsing ---
const args = process.argv.slice(2);
function getArg(flag) {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
}
const LIVE_ONLY = args.includes('--live');

// All known American tracks with TwinSpires match patterns
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

// Tracks from --tracks '["Horseshoe Indianapolis","Oak Grove"]' or default to first two
const cliTracksArg = getArg('--tracks');
const selectedNames = cliTracksArg ? JSON.parse(cliTracksArg) : null;
const TRACKS = selectedNames
  ? ALL_TRACKS.filter(t => selectedNames.includes(t.name))
  : ALL_TRACKS.slice(0, 2);

// Tabs to capture (live mode just grabs the current odds view)
const TABS = LIVE_ONLY
  ? ['advanced']
  : ['advanced', 'speed', 'class', 'pace', 'tips'];

// Date from --date YYYY-MM-DD or today
const TODAY = getArg('--date') ?? new Date().toLocaleDateString('en-CA');
const SCREENSHOT_BASE = path.join(__dirname, 'betting-app', 'public', 'screenshots', TODAY);
const MAX_RACES = 14; // maximum races to try per track

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function saveDir(trackName, raceNum) {
  const dir = path.join(SCREENSHOT_BASE, slugify(trackName), `race-${raceNum}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Replace the race number in a TwinSpires race URL */
function urlForRace(baseUrl, raceNum) {
  // Pattern: .../[type]/[racenum]/[tab]  — replace racenum
  return baseUrl.replace(/\/(\w+)\/(\w+)$/, `/${raceNum}/$2`);
}

/** Replace the tab in a TwinSpires race URL */
function urlForTab(baseUrl, tab) {
  // Pattern: .../[racenum]/[tab]  — replace tab
  return baseUrl.replace(/\/(\w+)$/, `/${tab}`);
}

async function findTrackBaseUrl(page, track) {
  console.log(`\n[Track] ${track.name} — clicking Today's Races entry...`);

  await page.goto('https://www.twinspires.com/bet/todays-races/time', {
    waitUntil: 'domcontentloaded', timeout: 25000,
  });
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1500);

  // TwinSpires uses Angular Router — no <a href> links. Use force:true to bypass
  // the tote-board overlay that intercepts pointer events on the track row.
  const trackRow = page.locator(
    '.track-group-container-col, .track-race-info, cdux-track-group'
  ).filter({ hasText: track.match }).first();

  const found = await trackRow.count();
  if (!found) {
    console.warn(`  "${track.name}" not found.`);
    const dbg = path.join(SCREENSHOT_BASE, `_debug-${slugify(track.name)}.png`);
    await page.screenshot({ path: dbg, fullPage: true });
    return null;
  }

  await trackRow.click({ force: true });
  await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(1500);

  let url = page.url();
  console.log(`  Landed at: ${url}`);

  // Normalize to race 1 / advanced tab
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

  // Probe how many races exist for this track (stop when page 404s or shows no content)
  const racesToCapture = [];
  for (let r = 1; r <= MAX_RACES; r++) {
    const testUrl = urlForTab(urlForRace(baseUrl, r), 'advanced');
    const resp = await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 12000 });
    if (!resp || resp.status() === 404) {
      console.log(`  Race ${r} returned 404 — stopping at ${r - 1} race(s).`);
      break;
    }
    // Check if there's actual race content (not a redirect to race 1)
    const finalUrl = page.url();
    if (r > 1 && finalUrl === urlForTab(urlForRace(baseUrl, 1), 'advanced')) {
      console.log(`  Race ${r} redirected back to Race 1 — stopping.`);
      break;
    }
    racesToCapture.push(r);
  }

  console.log(`  Races found: ${racesToCapture.join(', ')}`);
  if (racesToCapture.length > 0) await createRaceDayInApp(TODAY, track.name);

  for (const raceNum of racesToCapture) {
    console.log(`\n  [Race ${raceNum}]`);
    const dir = saveDir(track.name, raceNum);

    for (const tab of TABS) {
      const tabUrl = urlForTab(urlForRace(baseUrl, raceNum), tab);
      const filePath = path.join(dir, `${tab}.png`);
      const r2Key = `screenshots/${TODAY}/${slugify(track.name)}/race-${raceNum}/${tab}.png`;
      const ok = await captureTab(page, tabUrl, filePath, r2Key);
      if (ok) {
        console.log(`    ✓ ${tab}.png${r2 ? ' → R2' : ''}`);
      } else {
        console.log(`    – ${tab} not available`);
      }
    }
  }
}

async function main() {
  console.log(`\nTwinSpires Screenshot Capture — ${TODAY}`);
  console.log(`Tracks: ${TRACKS.map(t => t.name).join(', ')}`);
  console.log(`Tabs:   ${TABS.join(', ')}`);
  console.log(`Output: ${SCREENSHOT_BASE}\n`);

  fs.mkdirSync(SCREENSHOT_BASE, { recursive: true });

  const isCI = !!process.env.CI;
  const browser = await chromium.launch({ headless: isCI, slowMo: isCI ? 0 : 100 });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // First load — dismiss cookie banner
  await page.goto('https://www.twinspires.com/bet/todays-races/time', {
    waitUntil: 'domcontentloaded', timeout: 25000,
  });
  await page.waitForTimeout(1500);
  await page.locator('button:has-text("I Understand"), button:has-text("Accept All"), button:has-text("Accept")').first()
    .click({ timeout: 5000 }).catch(() => {});

  try {
    for (const track of TRACKS) {
      await captureTrack(page, track);
    }
    await cleanupPreviousDayR2();
    console.log('\nAll done! Screenshots saved to:');
    console.log(SCREENSHOT_BASE);
  } catch (err) {
    console.error('\nFatal error:', err.message);
    const debugPath = path.join(SCREENSHOT_BASE, '_debug-error.png');
    await page.screenshot({ path: debugPath }).catch(() => {});
    console.error('Debug screenshot:', debugPath);
  } finally {
    await browser.close();
  }
}

main();
