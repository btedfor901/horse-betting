/**
 * Extract speed/class/pace stats DIRECTLY from TwinSpires DOM for all Horseshoe Indianapolis races.
 * More reliable than screenshot+OCR for numeric data.
 * Usage: node extract-stats-dom.mjs [--race N] [--track "Horseshoe Indianapolis"]
 */
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, 'betting-app', '.env') });

const APP_URL = process.env.RAILWAY_APP_URL;
const TODAY = new Date().toLocaleDateString('en-CA');

const args = process.argv.slice(2);
const getArg = f => { const i = args.indexOf(f); return i !== -1 ? args[i + 1] : null; };
const onlyRace = getArg('--race') ? parseInt(getArg('--race')) : null;
const trackArg = getArg('--track') ?? 'Horseshoe Indianapolis';

// Get race day from app
const rdRes = await fetch(`${APP_URL}/api/race-days?date=${TODAY}`);
const raceDays = await rdRes.json();
const rd = raceDays.find(rd => rd.track === trackArg);
if (!rd) { console.error(`No race day found for ${trackArg}`); process.exit(1); }

const races = rd.races
  .filter(r => r.horses?.length > 0 && (!onlyRace || r.number === onlyRace))
  .sort((a, b) => a.number - b.number);

console.log(`\n${trackArg} — ${races.length} races to process`);

// Determine base URL from track
const TRACK_PATHS = {
  'Horseshoe Indianapolis': 'horseshoe-indianapolis/ind/Thoroughbred',
  'Oak Grove': 'oak-grove/ogr/Harness',
};
const trackPath = TRACK_PATHS[trackArg] ?? 'horseshoe-indianapolis/ind/Thoroughbred';
const BASE = `https://www.twinspires.com/bet/program/classic/${trackPath}`;

const browser = await chromium.launch({ headless: false, slowMo: 80 });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

// Dismiss cookie banner once
await page.goto(`${BASE}/1/advanced`, { waitUntil: 'domcontentloaded', timeout: 25000 });
await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
await page.waitForTimeout(1500);
await page.locator('button:has-text("I Understand"), button:has-text("Accept All")').first().click({ timeout: 5000 }).catch(() => {});

async function clickTab(label) {
  try {
    const btn = page.locator(`button:text-is("${label}"), a:text-is("${label}")`).first();
    if (await btn.count()) { await btn.click({ force: true }); await page.waitForTimeout(800); }
  } catch {}
}

async function extractTableData(colMap) {
  // Generic: extract a TwinSpires program table by reading column headers then data rows
  return page.evaluate((colMap) => {
    // Find all possible table-like containers
    const tables = document.querySelectorAll('table, [class*="entry-list"], [class*="runner-list"]');
    const results = [];

    // Try standard HTML table first
    for (const tbl of tables) {
      const headers = Array.from(tbl.querySelectorAll('th')).map(h => h.textContent?.trim().toLowerCase());
      if (!headers.length) continue;
      const rows = tbl.querySelectorAll('tr');
      for (const row of rows) {
        const cells = Array.from(row.querySelectorAll('td'));
        if (!cells.length) continue;
        const obj = {};
        for (const [key, patterns] of Object.entries(colMap)) {
          const idx = headers.findIndex(h => patterns.some(p => h.includes(p)));
          if (idx >= 0 && cells[idx]) obj[key] = cells[idx].textContent?.trim();
        }
        if (obj.horseName) results.push(obj);
      }
    }
    return results;
  }, colMap);
}

for (const race of races) {
  console.log(`\n[Race ${race.number}] ${race.horses.length} horses`);

  // Navigate to this race's advanced tab first
  await page.goto(`${BASE}/${race.number}/advanced`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(800);
  await page.locator('button:has-text("I Understand"), button:has-text("Accept All")').first().click({ timeout: 3000 }).catch(() => {});

  // ── SPEED tab ──────────────────────────────────────────────────────────────
  await clickTab('SPEED');
  const speedData = await page.evaluate(() => {
    const runners = document.querySelectorAll('[class*="runner"], [class*="entry"]');
    return Array.from(runners).map(r => {
      const name = r.querySelector('[class*="name"]')?.textContent?.trim();
      if (!name) return null;

      // Grab all visible numeric values from the runner row
      const nums = Array.from(r.querySelectorAll('[class*="speed"], [class*="avg"], [class*="best"], [class*="last"], [class*="figure"]'))
        .map(el => el.textContent?.trim())
        .filter(v => v && /^\d+$/.test(v) && parseInt(v) > 20); // filter out ranks/positions

      // Also grab all text content and look for multi-digit numbers in 50-120 range
      const allText = r.textContent ?? '';
      const figures = (allText.match(/\b([5-9]\d|1[0-1]\d)\b/g) ?? []).map(Number);

      return { name, nums, figures };
    }).filter(Boolean);
  });

  const speedMap = {};
  for (const s of speedData) {
    if (!s.name || !s.figures.length) continue;
    // Use first figure as bestSpeed, second as backSpeed, etc.
    speedMap[s.name] = {
      bestSpeed: s.figures[0] ?? null,
      backSpeed: s.figures[1] ?? null,
      speedLR: s.figures[0] ?? null, // last race speed
      avgSpeed: s.figures.length > 1 ? Math.round(s.figures.reduce((a,b) => a+b, 0) / s.figures.length) : s.figures[0] ?? null,
    };
  }
  console.log(`  Speed figures: ${Object.keys(speedMap).length} horses`);

  // ── CLASS tab ──────────────────────────────────────────────────────────────
  await clickTab('CLASS');
  const classData = await page.evaluate(() => {
    const runners = document.querySelectorAll('[class*="runner"], [class*="entry"]');
    return Array.from(runners).map(r => {
      const name = r.querySelector('[class*="name"]')?.textContent?.trim();
      if (!name) return null;
      const allText = r.textContent ?? '';
      // Prime Power is typically 100-200 range decimal
      const ppMatch = allText.match(/\b(\d{3}\.?\d*)\b/);
      // Class ratings typically 60-120
      const classNums = (allText.match(/\b([6-9]\d|1[0-2]\d)\b/g) ?? []).map(Number);
      return { name, primePower: ppMatch ? parseFloat(ppMatch[1]) : null, classNums };
    }).filter(Boolean);
  });

  const classMap = {};
  for (const c of classData) {
    if (!c.name) continue;
    classMap[c.name] = {
      primePower: c.primePower,
      avgClass: c.classNums[0] ?? null,
      lastClass: c.classNums[1] ?? null,
    };
  }
  console.log(`  Class: ${Object.keys(classMap).length} horses`);

  // ── PACE tab ──────────────────────────────────────────────────────────────
  await clickTab('PACE');
  const paceData = await page.evaluate(() => {
    const runners = document.querySelectorAll('[class*="runner"], [class*="entry"]');
    return Array.from(runners).map(r => {
      const name = r.querySelector('[class*="name"]')?.textContent?.trim();
      if (!name) return null;
      // Pace figures: decimal numbers like 45.2, 47.8, 35.4
      const allText = r.textContent ?? '';
      const paceNums = (allText.match(/\b(\d{2,3}\.\d)\b/g) ?? []).map(Number);
      return { name, paceNums };
    }).filter(Boolean);
  });

  const paceMap = {};
  for (const p of paceData) {
    if (!p.name || !p.paceNums.length) continue;
    paceMap[p.name] = {
      earlyPace1: p.paceNums[0] ?? null,
      earlyPace2: p.paceNums[1] ?? null,
      latePace: p.paceNums[2] ?? null,
    };
  }
  console.log(`  Pace: ${Object.keys(paceMap).length} horses`);

  // ── Merge + save ──────────────────────────────────────────────────────────
  const updatedHorses = race.horses.map(h => {
    const name = h.horseName ?? h.name;
    return {
      ...h,
      ...(speedMap[name] ?? {}),
      ...(classMap[name] ?? {}),
      ...(paceMap[name] ?? {}),
    };
  });

  const hr = await fetch(`${APP_URL}/api/races/${race.id}/horses`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedHorses),
  });
  if (hr.ok) {
    const hasSpeed = updatedHorses.filter(h => h.bestSpeed).length;
    console.log(`  ✓ Saved — ${hasSpeed}/${updatedHorses.length} horses have speed figures`);
  } else {
    console.warn(`  ✗ Save failed: ${hr.status}`);
  }
}

await browser.close();
console.log('\nDone.');
