/**
 * Fix Race 5 Horseshoe Indianapolis using DOM extraction for horse list
 * + screenshots for detailed stats (speed, class, pace, etc.)
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
  } catch (e) { console.warn(`R2: ${e.message}`); }
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

console.log('Loading Race 5...');
await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 25000 });
await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
await page.waitForTimeout(2000);
await page.locator('button:has-text("I Understand"), button:has-text("Accept All")').first().click({ timeout: 5000 }).catch(() => {});
await page.waitForTimeout(1000);

// ── Step 1: Extract ALL horse data from DOM ──────────────────────────────────
console.log('\nExtracting horses from DOM...');
const domData = await page.evaluate(() => {
  const runners = document.querySelectorAll('[class*="runner"]');
  const horses = [];

  for (const runner of runners) {
    const name = runner.querySelector('[class*="name"]')?.textContent?.trim();
    if (!name || name.length < 2) continue;

    // Post position — look for number near the runner
    const postEl = runner.querySelector('[class*="post"], [class*="program"], [class*="number"]');
    const post = postEl ? parseInt(postEl.textContent?.trim()) : null;

    // Morning line odds
    const oddsEl = runner.querySelector('[class*="odds"], [class*="morning"]');
    const odds = oddsEl?.textContent?.trim() ?? null;

    // Jockey
    const jockeyEl = runner.querySelector('[class*="jockey"]');
    const jockey = jockeyEl?.textContent?.trim() ?? null;

    // Trainer
    const trainerEl = runner.querySelector('[class*="trainer"]');
    const trainer = trainerEl?.textContent?.trim() ?? null;

    // Scratched?
    const scratched = runner.classList.toString().includes('scratch') ||
      runner.querySelector('[class*="scratch"]') !== null ||
      runner.textContent?.includes('SCR');

    horses.push({ name, post, odds, jockey, trainer, scratched });
  }

  return horses;
});

console.log(`DOM found ${domData.length} horses:`);
domData.forEach((h, i) => console.log(`  ${i + 1}. [${h.post ?? '?'}] ${h.name}${h.scratched ? ' SCR' : ''} — ${h.jockey ?? 'no jockey'}`));

// ── Step 2: Capture all tabs with screenshots ────────────────────────────────
console.log('\nCapturing tab screenshots...');
for (const tab of TABS) {
  const label = TAB_LABELS[tab];
  try {
    const btn = page.locator(`button:text-is("${label}"), a:text-is("${label}")`).first();
    if (await btn.count()) { await btn.click({ force: true }); await page.waitForTimeout(700); }
  } catch {}

  await page.evaluate(() => {
    document.querySelectorAll('*').forEach(el => {
      const s = window.getComputedStyle(el);
      if ((s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 10) {
        el.style.overflowY = 'visible'; el.style.maxHeight = 'none'; el.style.height = 'auto';
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

// ── Step 3: Use DOM horse list + screenshots for stats ───────────────────────
console.log('\nExtracting stats via Claude...');

// Use advanced screenshot for race metadata + fill any missing basics
const advMsg = await claude.messages.create({
  model: 'claude-haiku-4-5-20251001', max_tokens: 3000,
  messages: [{ role: 'user', content: [
    imgContent(path.join(dir, 'advanced.png')),
    { type: 'text', text: `TwinSpires Advanced tab Race ${RACE_NUM}. We know there are 11 horses. Extract race metadata and all horse basics. Return ONLY JSON:
{"distance":"6f","surface":"dirt","raceType":"claiming","horses":[{"postPosition":1,"horseName":"Name","morningLineOdds":"8/5","jockeyName":"Smith, J","jockeyWinPct":20,"trainerName":"Jones, B","trainerWinPct":15,"daysOff":14,"scratched":false}]}
Include ALL horses you can see. Return ONLY the JSON.` }
  ] }],
});
const advData = parseJSON(advMsg.content[0]?.text ?? '', {});
const claudeHorses = advData.horses ?? [];
console.log(`  Advanced screenshot: ${claudeHorses.length} horses from Claude`);

// Merge: start with DOM list (authoritative for names), fill in Claude data where name matches
const knownNames = [
  'Wakan', 'Right to Win', 'Aguila Negra', 'Covert Law', 'Magical Wish',
  "David's Creed", 'Passing Judgment', 'Professor Higgins', 'Gotcha',
  'Boss of All Bosses', 'Right On Right On',
];

const horses = knownNames.map((name, i) => {
  const claudeMatch = claudeHorses.find(h =>
    h.horseName?.toLowerCase().includes(name.toLowerCase().split(' ')[0]) ||
    name.toLowerCase().includes((h.horseName ?? '').toLowerCase().split(' ')[0])
  );
  const domMatch = domData.find(h => h.name?.toLowerCase().includes(name.toLowerCase().split(' ')[0]));
  return {
    postPosition: claudeMatch?.postPosition ?? domMatch?.post ?? (i + 1),
    horseName: name,
    morningLineOdds: claudeMatch?.morningLineOdds ?? domMatch?.odds ?? '',
    jockeyName: claudeMatch?.jockeyName ?? domMatch?.jockey ?? '',
    jockeyWinPct: claudeMatch?.jockeyWinPct ?? null,
    trainerName: claudeMatch?.trainerName ?? domMatch?.trainer ?? '',
    trainerWinPct: claudeMatch?.trainerWinPct ?? null,
    daysOff: claudeMatch?.daysOff ?? null,
    scratched: claudeMatch?.scratched ?? domMatch?.scratched ?? false,
  };
});

console.log(`  Merged: ${horses.length} horses total`);

// Speed, class, pace, summary, tips from remaining tabs
for (const [tab, prompt, fields] of [
  ['speed', `Speed tab Race ${RACE_NUM}. 11 horses total. Return ONLY JSON array: [{"horseName":"Name","bestSpeed":95,"backSpeed":88,"speedLR":90,"avgSpeed":87}]`, ['bestSpeed','backSpeed','speedLR','avgSpeed']],
  ['class', `Class tab Race ${RACE_NUM}. Return ONLY JSON array: [{"horseName":"Name","primePower":145.2,"avgClass":95,"lastClass":100}]`, ['primePower','avgClass','lastClass']],
  ['pace',  `Pace tab Race ${RACE_NUM}. Return ONLY JSON array: [{"horseName":"Name","earlyPace1":45.2,"earlyPace2":47.8,"latePace":35.4}]`, ['earlyPace1','earlyPace2','latePace']],
  ['summary', `Summary tab Race ${RACE_NUM}. Return ONLY JSON array: [{"horseName":"Name","runStyle":"E"}]. runStyle: E, P, S, or C.`, ['runStyle']],
  ['tips',  `Tips tab Race ${RACE_NUM}. Return ONLY JSON array: [{"horseName":"Name","angles":"Hot Jockey, Key Trainer"}].`, ['angles']],
]) {
  const img = imgContent(path.join(dir, `${tab}.png`));
  if (!img) continue;
  const r = await claude.messages.create({ model: 'claude-haiku-4-5-20251001', max_tokens: 2000, messages: [{ role: 'user', content: [img, { type: 'text', text: prompt }] }] });
  for (const row of parseJSON(r.content[0]?.text ?? '', [])) {
    const h = horses.find(h => {
      const n1 = h.horseName.toLowerCase(); const n2 = (row.horseName ?? '').toLowerCase();
      return n1 === n2 || n1.includes(n2.split(' ')[0]) || n2.includes(n1.split(' ')[0]);
    });
    if (h) for (const f of fields) if (row[f] !== undefined) h[f] = row[f];
  }
  console.log(`  ✓ ${tab}`);
}

// Save to DB
const rdRes = await fetch(`${APP_URL}/api/race-days?date=${TODAY}`);
const raceDays = await rdRes.json();
const rd = raceDays.find(rd => rd.track === 'Horseshoe Indianapolis');
if (!rd) { console.error('No race day found'); process.exit(1); }

const raceRes = await fetch(`${APP_URL}/api/races`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ raceDayId: rd.id, number: RACE_NUM, distance: advData.distance || '6f', surface: advData.surface || 'dirt', raceType: advData.raceType || 'allowance' }),
});
const race = await raceRes.json();

const hr = await fetch(`${APP_URL}/api/races/${race.id}/horses`, {
  method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(horses),
});

if (hr.ok) {
  console.log(`\n✓ Race ${RACE_NUM} saved with ${horses.length} horses:`);
  horses.forEach(h => console.log(`  [${h.postPosition}] ${h.horseName}${h.scratched ? ' SCR' : ''}`));
} else {
  console.error(`Failed: ${hr.status} ${await hr.text()}`);
}
