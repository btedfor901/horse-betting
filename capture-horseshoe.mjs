/**
 * One-shot: capture all tabs for Horseshoe Indianapolis today (including summary)
 * and upload to R2. Skips extraction since horses are already in DB.
 */

import { chromium } from 'playwright';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, 'betting-app', '.env') });

const TODAY = new Date().toLocaleDateString('en-CA');
const TABS = ['advanced', 'speed', 'class', 'pace', 'tips', 'summary'];
const TRACK_SLUG = 'horseshoe-indianapolis';
const SCREENSHOT_BASE = path.join(__dirname, 'betting-app', 'public', 'screenshots', TODAY, TRACK_SLUG);

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});

async function uploadToR2(localPath, r2Key) {
  try {
    await r2.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: r2Key,
      Body: fs.createReadStream(localPath),
      ContentType: 'image/png',
    }));
    return true;
  } catch (e) {
    console.warn(`    R2 upload failed: ${e.message}`);
    return false;
  }
}

// Detect how many races exist from local folders
const raceFolders = fs.readdirSync(SCREENSHOT_BASE)
  .filter(d => /^race-\d+$/.test(d))
  .map(d => parseInt(d.replace('race-', ''), 10))
  .sort((a, b) => a - b);

console.log(`Found ${raceFolders.length} race folders: ${raceFolders.join(', ')}`);

const browser = await chromium.launch({ headless: false, slowMo: 100 });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

// Navigate to Horseshoe Indianapolis race 1 advanced to find the base URL
await page.goto('https://www.twinspires.com/bet/todays-races/time', { waitUntil: 'domcontentloaded', timeout: 25000 });
await page.waitForTimeout(2000);
await page.locator('button:has-text("I Understand"), button:has-text("Accept All"), button:has-text("Accept")')
  .first().click({ timeout: 5000 }).catch(() => {});

// Click Horseshoe Indianapolis
const trackRow = page.locator('.track-group-container-col, .track-race-info, cdux-track-group, [class*="track"]')
  .filter({ hasText: /horseshoe\s+indianapolis/i }).first();

if (!await trackRow.count()) {
  console.error('Could not find Horseshoe Indianapolis on the page');
  await browser.close();
  process.exit(1);
}

await trackRow.click({ force: true });
await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
await page.waitForTimeout(1500);

let baseUrl = page.url().replace(/\/(\d+)\/\w+$/, '/1/advanced');
if (!baseUrl.includes('/advanced')) baseUrl = baseUrl.replace(/\/$/, '') + '/1/advanced';
console.log(`Base URL: ${baseUrl}`);

for (const raceNum of raceFolders) {
  const dir = path.join(SCREENSHOT_BASE, `race-${raceNum}`);
  console.log(`\n[Race ${raceNum}]`);

  for (const tab of TABS) {
    const filePath = path.join(dir, `${tab}.png`);
    const r2Key = `screenshots/${TODAY}/${TRACK_SLUG}/race-${raceNum}/${tab}.png`;
    const tabUrl = baseUrl
      .replace(/\/\d+\/\w+$/, `/${raceNum}/${tab}`);

    try {
      const resp = await page.goto(tabUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      if (resp && resp.status() === 404) { console.log(`    – ${tab} 404`); continue; }
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(900);
      await page.screenshot({ path: filePath, fullPage: false });
      const uploaded = await uploadToR2(filePath, r2Key);
      console.log(`    ✓ ${tab}.png${uploaded ? ' → R2' : ''}`);
    } catch (e) {
      console.log(`    – ${tab} error: ${e.message}`);
    }
  }
}

await browser.close();
console.log('\nDone.');
