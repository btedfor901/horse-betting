/**
 * Targeted fix for Race 5 at Horseshoe Indianapolis — expands scroll containers
 * so all horses are captured before screenshotting.
 */
import { chromium } from 'playwright';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import Anthropic from '@anthropic-ai/sdk';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, 'betting-app', '.env') });

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const APP_URL = process.env.RAILWAY_APP_URL;
const TODAY = new Date().toLocaleDateString('en-CA');
const RACE_NUM = 5;
const TRACK_SLUG = 'horseshoe-indianapolis';
const BASE_URL = `https://www.twinspires.com/bet/program/classic/horseshoe-indianapolis/ind/Thoroughbred/${RACE_NUM}/advanced`;

const dir = path.join(__dirname, 'betting-app', 'public', 'screenshots', TODAY, TRACK_SLUG, `race-${RACE_NUM}`);
fs.mkdirSync(dir, { recursive: true });

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});

async function uploadToR2(localPath, r2Key) {
  try {
    await r2.send(new PutObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: r2Key, Body: fs.createReadStream(localPath), ContentType: 'image/png' }));
  } catch (e) { console.warn(`R2 upload failed: ${e.message}`); }
}

function parseJSON(text, fallback) {
  try { const m = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/); return m ? JSON.parse(m[0]) : fallback; }
  catch { return fallback; }
}

function imgContent(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return { type: 'image', source: { type: 'base64', media_type: 'image/png', data: fs.readFileSync(filePath).toString('base64') } };
}

const TABS = ['advanced', 'speed', 'class', 'pace', 'tips', 'summary'];
const TAB_LABELS = { advanced: 'ADVANCED', speed: 'SPEED', class: 'CLASS', pace: 'PACE', tips: 'TIPS', summary: 'SUMMARY' };

const browser = await chromium.launch({ headless: false, slowMo: 100 });
const context = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
await context.addInitScript(() => { document.documentElement.style.zoom = '0.75'; });
const page = await context.newPage();

console.log(`Fixing Race ${RACE_NUM} at Horseshoe Indianapolis — capturing all horses...`);

await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 25000 });
await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
await page.waitForTimeout(1500);
await page.locator('button:has-text("I Understand"), button:has-text("Accept All")').first().click({ timeout: 5000 }).catch(() => {});

for (const tab of TABS) {
  const label = TAB_LABELS[tab];
  console.log(`  [${tab}] clicking tab...`);
  try {
    const btn = page.locator(`button:text-is("${label}"), a:text-is("${label}")`).first();
    if (await btn.count()) { await btn.click({ force: true }); await page.waitForTimeout(700); }
  } catch (e) { console.log(`  – click failed: ${e.message.split('\n')[0]}`); }

  // Expand all scrollable containers so nothing is hidden
  await page.evaluate(() => {
    document.querySelectorAll('*').forEach(el => {
      const s = window.getComputedStyle(el);
      if ((s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 10) {
        el.style.overflowY = 'visible';
        el.style.maxHeight = 'none';
        el.style.height = 'auto';
      }
    });
  }).catch(() => {});

  await page.waitForTimeout(300);
  const filePath = path.join(dir, `${tab}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  await uploadToR2(filePath, `screenshots/${TODAY}/${TRACK_SLUG}/race-${RACE_NUM}/${tab}.png`);
  console.log(`  ✓ ${tab}.png → R2`);
}

await browser.close();

// Extract from screenshots
console.log('\nExtracting data via Claude...');
const horses = [];

const advMsg = await claude.messages.create({
  model: 'claude-haiku-4-5-20251001', max_tokens: 3000,
  messages: [{ role: 'user', content: [imgContent(path.join(dir, 'advanced.png')), { type: 'text', text: `TwinSpires Advanced tab Race ${RACE_NUM}. Extract ALL horses including scratched. Return ONLY JSON:
{"distance":"6f","surface":"dirt","raceType":"claiming","horses":[{"postPosition":1,"horseName":"Name","morningLineOdds":"8/5","jockeyName":"Smith, J","jockeyWinPct":20,"trainerName":"Jones, B","trainerWinPct":15,"daysOff":14}]}
surface: dirt|turf|synthetic  raceType: claiming|maiden|maiden-claiming|allowance|stakes|handicap|optional-claiming. Return ONLY the JSON.` }] }],
});
const advData = parseJSON(advMsg.content[0]?.text ?? '', {});
horses.push(...(advData.horses ?? []));
console.log(`  Advanced: ${horses.length} horses found`);

for (const [tab, prompt, fields] of [
  ['speed', `Speed tab Race ${RACE_NUM}. Return ONLY JSON array: [{"horseName":"Name","bestSpeed":95,"backSpeed":88,"speedLR":90,"avgSpeed":87}]`, ['bestSpeed','backSpeed','speedLR','avgSpeed']],
  ['class', `Class tab Race ${RACE_NUM}. Return ONLY JSON array: [{"horseName":"Name","primePower":145.2,"avgClass":95,"lastClass":100}]`, ['primePower','avgClass','lastClass']],
  ['pace',  `Pace tab Race ${RACE_NUM}. Return ONLY JSON array: [{"horseName":"Name","earlyPace1":45.2,"earlyPace2":47.8,"latePace":35.4}]`, ['earlyPace1','earlyPace2','latePace']],
  ['summary', `Summary tab Race ${RACE_NUM}. Return ONLY JSON array: [{"horseName":"Name","runStyle":"E"}]. runStyle: E, P, S, or C.`, ['runStyle']],
  ['tips',  `Tips tab Race ${RACE_NUM}. Return ONLY JSON array: [{"horseName":"Name","angles":"Hot Jockey, Key Trainer"}]. Use null if no angles.`, ['angles']],
]) {
  const img = imgContent(path.join(dir, `${tab}.png`));
  if (!img) continue;
  const r = await claude.messages.create({ model: 'claude-haiku-4-5-20251001', max_tokens: 2000, messages: [{ role: 'user', content: [img, { type: 'text', text: prompt }] }] });
  for (const row of parseJSON(r.content[0]?.text ?? '', [])) {
    const h = horses.find(h => h.horseName === row.horseName);
    if (h) for (const f of fields) if (row[f] !== undefined) h[f] = row[f];
  }
  console.log(`  ✓ ${tab}`);
}

// Get race day + race IDs from app
const rdRes = await fetch(`${APP_URL}/api/race-days?date=${TODAY}`);
const raceDays = await rdRes.json();
const rd = raceDays.find(rd => rd.track === 'Horseshoe Indianapolis');
if (!rd) { console.error('No Horseshoe Indianapolis race day found'); process.exit(1); }

const raceRes = await fetch(`${APP_URL}/api/races`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ raceDayId: rd.id, number: RACE_NUM, distance: advData.distance || 'Unknown', surface: advData.surface || 'dirt', raceType: advData.raceType || 'claiming' }),
});
const race = await raceRes.json();

const hr = await fetch(`${APP_URL}/api/races/${race.id}/horses`, {
  method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(horses),
});
if (hr.ok) console.log(`\n✓ Race ${RACE_NUM} updated with ${horses.length} horses`);
else console.error(`Horse save failed: ${hr.status}`);
