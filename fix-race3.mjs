/**
 * Re-capture Race 3 at Horseshoe Indianapolis with zoomed-out viewport
 * so all horses are visible, then re-extract and save to Railway.
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

const TODAY = new Date().toLocaleDateString('en-CA');
const TRACK_SLUG = 'horseshoe-indianapolis';
const RACE_NUM = 3;
const DIR = path.join(__dirname, 'betting-app', 'public', 'screenshots', TODAY, TRACK_SLUG, `race-${RACE_NUM}`);
const APP_URL = process.env.RAILWAY_APP_URL;

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});
const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function upload(localPath, r2Key) {
  await r2.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: r2Key,
    Body: fs.createReadStream(localPath),
    ContentType: 'image/png',
  }));
}

function parseJSON(text, fallback) {
  try { const m = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/); return m ? JSON.parse(m[0]) : fallback; }
  catch { return fallback; }
}

function readB64(tab) {
  const p = path.join(DIR, `${tab}.png`);
  if (!fs.existsSync(p)) return null;
  return { type: 'image', source: { type: 'base64', media_type: 'image/png', data: fs.readFileSync(p).toString('base64') } };
}

// ── Launch browser zoomed out so all horses fit ───────────────────────────────
const browser = await chromium.launch({ headless: false, slowMo: 50 });
// Use tall viewport + set zoom via CSS so all program rows are visible
const context = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
const page = await context.newPage();

// Zoom out to 75% so more rows fit
await page.addInitScript(() => { document.documentElement.style.zoom = '0.75'; });

const BASE = `https://www.twinspires.com/bet/program/classic/horseshoe-indianapolis/ind/Thoroughbred/${RACE_NUM}`;

await page.goto(`${BASE}/advanced`, { waitUntil: 'domcontentloaded', timeout: 20000 });
await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
await page.waitForTimeout(1500);
await page.locator('button:has-text("I Understand"), button:has-text("Accept All")').first().click({ timeout: 3000 }).catch(() => {});
await page.waitForTimeout(500);

fs.mkdirSync(DIR, { recursive: true });

const TABS = ['advanced', 'speed', 'class', 'pace', 'tips', 'summary'];
const LABELS = { advanced: 'ADVANCED', speed: 'SPEED', class: 'CLASS', pace: 'PACE', tips: 'TIPS', summary: 'SUMMARY' };

for (const tab of TABS) {
  if (tab !== 'advanced') {
    const btn = page.locator(`text="${LABELS[tab]}"`).first();
    if (await btn.count()) { await btn.click({ force: true }); await page.waitForTimeout(700); }
  }
  const filePath = path.join(DIR, `${tab}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  await upload(filePath, `screenshots/${TODAY}/${TRACK_SLUG}/race-${RACE_NUM}/${tab}.png`);
  console.log(`✓ ${tab}.png → R2`);
}

await browser.close();

// ── Re-extract with Claude ────────────────────────────────────────────────────
console.log('\nExtracting horse data from new screenshots...');

const advMsg = await claude.messages.create({
  model: 'claude-haiku-4-5-20251001', max_tokens: 4000,
  messages: [{ role: 'user', content: [
    readB64('advanced'),
    { type: 'text', text: `TwinSpires Advanced tab Race ${RACE_NUM}. Extract ALL horses including scratched ones.
Return ONLY JSON:
{"distance":"6f","surface":"dirt","raceType":"maiden","horses":[
  {"postPosition":1,"horseName":"Name","morningLineOdds":"8/5","jockeyName":"Last, First","jockeyWinPct":12,"trainerName":"Last, First","trainerWinPct":15,"daysOff":14,"scratched":false}
]}
- Set scratched:true for any horse marked SCR
- Include EVERY horse, scroll is zoomed out so all should be visible
- Return ONLY the JSON` }
  ]}]
});
const advData = parseJSON(advMsg.content[0]?.text ?? '', {});
const horses = advData.horses ?? [];
console.log(`Advanced: ${horses.length} horses (${horses.filter(h=>h.scratched).length} scratched)`);
horses.forEach(h => console.log(`  ${h.postPosition}. ${h.horseName}${h.scratched?' (SCR)':''}`));

// Speed
const spdMsg = await claude.messages.create({
  model: 'claude-haiku-4-5-20251001', max_tokens: 2000,
  messages: [{ role: 'user', content: [readB64('speed'), { type: 'text', text: `Speed tab Race ${RACE_NUM}. All horses. Return ONLY JSON array: [{"horseName":"Name","bestSpeed":95,"backSpeed":88,"speedLR":90,"avgSpeed":87}]` }] }]
});
for (const s of parseJSON(spdMsg.content[0]?.text ?? '', [])) {
  const h = horses.find(h => h.horseName === s.horseName);
  if (h) Object.assign(h, { bestSpeed: s.bestSpeed, backSpeed: s.backSpeed, speedLR: s.speedLR, avgSpeed: s.avgSpeed });
}

// Class
const clsMsg = await claude.messages.create({
  model: 'claude-haiku-4-5-20251001', max_tokens: 2000,
  messages: [{ role: 'user', content: [readB64('class'), { type: 'text', text: `Class tab Race ${RACE_NUM}. All horses. Return ONLY JSON array: [{"horseName":"Name","primePower":145.2,"avgClass":95,"lastClass":100}]` }] }]
});
for (const c of parseJSON(clsMsg.content[0]?.text ?? '', [])) {
  const h = horses.find(h => h.horseName === c.horseName);
  if (h) Object.assign(h, { primePower: c.primePower, avgClass: c.avgClass, lastClass: c.lastClass });
}

// Pace
const paceMsg = await claude.messages.create({
  model: 'claude-haiku-4-5-20251001', max_tokens: 2000,
  messages: [{ role: 'user', content: [readB64('pace'), { type: 'text', text: `Pace tab Race ${RACE_NUM}. All horses. Return ONLY JSON array: [{"horseName":"Name","earlyPace1":45.2,"earlyPace2":47.8,"latePace":35.4,"avgDistance":null}]` }] }]
});
for (const p of parseJSON(paceMsg.content[0]?.text ?? '', [])) {
  const h = horses.find(h => h.horseName === p.horseName);
  if (h) Object.assign(h, { earlyPace1: p.earlyPace1, earlyPace2: p.earlyPace2, latePace: p.latePace, avgDistance: p.avgDistance });
}

// Summary (run style)
const sumMsg = await claude.messages.create({
  model: 'claude-haiku-4-5-20251001', max_tokens: 2000,
  messages: [{ role: 'user', content: [readB64('summary'), { type: 'text', text: `Summary tab Race ${RACE_NUM}. Return ONLY JSON array: [{"horseName":"Name","runStyle":"E"}]. E/P/S/C only.` }] }]
});
for (const s of parseJSON(sumMsg.content[0]?.text ?? '', [])) {
  const h = horses.find(h => h.horseName === s.horseName);
  if (h && s.runStyle) h.runStyle = s.runStyle;
}

// ── Save to Railway ───────────────────────────────────────────────────────────
// Get race3 ID
const rdRes = await fetch(`${APP_URL}/api/race-days?date=${TODAY}`);
const rds = await rdRes.json();
const hs = rds.find(rd => rd.track === 'Horseshoe Indianapolis');
const race3 = hs?.races?.find(r => r.number === RACE_NUM);

if (race3) {
  const hr = await fetch(`${APP_URL}/api/races/${race3.id}/horses`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(horses),
  });
  if (hr.ok) console.log(`\n✓ Saved ${horses.length} horses to Railway`);
  else console.log(`\nHorse save failed: ${hr.status} ${await hr.text()}`);
} else {
  console.log('Could not find Race 3 in DB');
}
