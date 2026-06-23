import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, 'betting-app', '.env') });

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function readImgBase64(filePath) {
  if (!fs.existsSync(filePath)) { console.log('  FILE NOT FOUND:', filePath); return null; }
  return fs.readFileSync(filePath).toString('base64');
}

function parseJSON(text, fallback) {
  try {
    const match = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
    return match ? JSON.parse(match[0]) : fallback;
  } catch (e) {
    console.log('  JSON parse error:', e.message);
    return fallback;
  }
}

const raceDir = path.join(__dirname, 'betting-app', 'public', 'screenshots', '2026-06-22', 'horseshoe-indianapolis', 'race-1');
console.log('Reading from:', raceDir);

const b64 = readImgBase64(path.join(raceDir, 'advanced.png'));
if (!b64) process.exit(1);

console.log('\nSending advanced.png to Claude...');
const msg = await claude.messages.create({
  model: 'claude-haiku-4-5-20251001',
  max_tokens: 3000,
  messages: [{
    role: 'user',
    content: [
      { type: 'image', source: { type: 'base64', media_type: 'image/png', data: b64 } },
      {
        type: 'text',
        text: `This is a TwinSpires horse racing program card (Advanced tab) for Race 1.
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

const raw = msg.content[0]?.text ?? '';
console.log('\n--- Raw Claude response ---');
console.log(raw);
console.log('\n--- Parsed ---');
const parsed = parseJSON(raw, {});
console.log(JSON.stringify(parsed, null, 2));
console.log('\nHorses found:', parsed.horses?.length ?? 0);
