import { chromium } from 'playwright';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, 'betting-app', '.env') });

const TODAY = new Date().toLocaleDateString('en-CA');
const TRACK_SLUG = 'horseshoe-indianapolis';
const BASE_DIR = path.join(__dirname, 'betting-app', 'public', 'screenshots', TODAY, TRACK_SLUG);

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});

async function upload(localPath, r2Key) {
  await r2.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: r2Key,
    Body: fs.createReadStream(localPath),
    ContentType: 'image/png',
  }));
}

const races = fs.readdirSync(BASE_DIR)
  .filter(d => /^race-\d+$/.test(d))
  .map(d => parseInt(d.replace('race-', ''), 10))
  .sort((a, b) => a - b);

console.log(`Fixing TIPS + SUMMARY for races: ${races.join(', ')}`);

const browser = await chromium.launch({ headless: false, slowMo: 50 });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// Go to race 1 first to establish the session
await page.goto('https://www.twinspires.com/bet/program/classic/horseshoe-indianapolis/ind/Thoroughbred/1/advanced', { waitUntil: 'domcontentloaded', timeout: 20000 });
await page.waitForTimeout(1500);
await page.locator('button:has-text("I Understand"), button:has-text("Accept All")').first().click({ timeout: 4000 }).catch(() => {});
await page.waitForTimeout(500);

for (const raceNum of races) {
  console.log(`\nRace ${raceNum}`);
  const dir = path.join(BASE_DIR, `race-${raceNum}`);

  await page.goto(`https://www.twinspires.com/bet/program/classic/horseshoe-indianapolis/ind/Thoroughbred/${raceNum}/advanced`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(800);
  await page.locator('button:has-text("I Understand"), button:has-text("Accept All")').first().click({ timeout: 2000 }).catch(() => {});

  for (const tab of ['tips', 'summary']) {
    const label = tab === 'tips' ? 'TIPS' : 'SUMMARY';
    const filePath = path.join(dir, `${tab}.png`);
    const r2Key = `screenshots/${TODAY}/${TRACK_SLUG}/race-${raceNum}/${tab}.png`;

    // Click the tab in the TwinSpires UI
    const btn = page.locator(`text="${label}"`).first();
    if (await btn.count()) {
      await btn.click({ force: true });
      await page.waitForTimeout(800);
    }

    await page.screenshot({ path: filePath, fullPage: false });
    await upload(filePath, r2Key);
    console.log(`  ✓ ${tab}.png → R2`);
  }
}

await browser.close();
console.log('\nDone — refresh the app to see correct TPS and SUM screenshots.');
