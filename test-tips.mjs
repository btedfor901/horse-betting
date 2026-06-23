import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, 'betting-app', '.env') });

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const raceDir = 'betting-app/public/screenshots/2026-06-22/horseshoe-indianapolis/race-1';

const b64 = fs.readFileSync(path.join(raceDir, 'tips.png')).toString('base64');
const r = await claude.messages.create({
  model: 'claude-haiku-4-5-20251001', max_tokens: 2000,
  messages: [{ role: 'user', content: [
    { type: 'image', source: { type: 'base64', media_type: 'image/png', data: b64 } },
    { type: 'text', text: 'Tips tab Race 1. Extract the Angles column for every horse. Return ONLY JSON array: [{"horseName":"Name","angles":"Hot Jockey, Key Trainer"}]. If no angles, use null. Return ONLY the JSON array.' }
  ]}]
});
console.log('Tips result:');
console.log(r.content[0].text);
