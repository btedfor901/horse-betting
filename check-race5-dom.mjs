/**
 * Use Playwright DOM extraction to count/list all horses in Race 5 at Horseshoe Indianapolis
 * instead of relying on screenshot + Claude Vision
 */
import { chromium } from 'playwright';
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

const browser = await chromium.launch({ headless: false, slowMo: 100 });
const context = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
const page = await context.newPage();

console.log('Loading Race 5...');
await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 25000 });
await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
await page.waitForTimeout(2000);
await page.locator('button:has-text("I Understand"), button:has-text("Accept All")').first().click({ timeout: 5000 }).catch(() => {});
await page.waitForTimeout(1000);

// Try to extract horse names directly from DOM
const domHorses = await page.evaluate(() => {
  const results = [];

  // Try various selectors TwinSpires might use
  const selectors = [
    '[class*="entry"] [class*="horse-name"]',
    '[class*="runner"] [class*="name"]',
    'cdux-program-entry [class*="name"]',
    '[id*="entry"] .name',
    '.program-entry-name',
    '[class*="entry-name"]',
    '.horse-name',
  ];

  for (const sel of selectors) {
    const els = document.querySelectorAll(sel);
    if (els.length > 0) {
      return { selector: sel, names: Array.from(els).map(e => e.textContent?.trim()).filter(Boolean) };
    }
  }

  // Fallback: dump all text from elements with "entry" or "runner" in class
  const candidates = document.querySelectorAll('[class*="entry"], [class*="runner"]');
  return {
    selector: 'fallback',
    names: Array.from(candidates)
      .filter(el => el.children.length === 0) // leaf nodes
      .map(el => el.textContent?.trim())
      .filter(t => t && t.length > 2 && t.length < 60)
      .slice(0, 30),
  };
});

console.log('\nDOM extraction result:');
console.log(`  Selector: ${domHorses.selector}`);
console.log(`  Found: ${domHorses.names.length} entries`);
domHorses.names.forEach((n, i) => console.log(`    ${i + 1}. ${n}`));

// Also take a debug screenshot to visually inspect
const dir = path.join(__dirname, 'betting-app', 'public', 'screenshots', TODAY, TRACK_SLUG, `race-${RACE_NUM}`);
fs.mkdirSync(dir, { recursive: true });

// Expand scroll containers
await page.evaluate(() => {
  document.querySelectorAll('*').forEach(el => {
    const s = window.getComputedStyle(el);
    if ((s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 5) {
      console.log('Expanding:', el.tagName, el.className.substring(0, 60), 'scrollHeight:', el.scrollHeight);
      el.style.overflowY = 'visible';
      el.style.maxHeight = 'none';
      el.style.height = 'auto';
    }
  });
});

await page.waitForTimeout(500);
await page.screenshot({ path: path.join(dir, 'debug-expanded.png'), fullPage: true });
console.log('\nDebug screenshot saved: debug-expanded.png');

// Count all visible horse-like text in expanded view
const allText = await page.evaluate(() => {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const texts = [];
  let node;
  while (node = walker.nextNode()) {
    const t = node.textContent?.trim();
    if (t && t.length > 2) texts.push(t);
  }
  return texts;
});

await browser.close();
console.log(`\nTotal text nodes: ${allText.length}`);
