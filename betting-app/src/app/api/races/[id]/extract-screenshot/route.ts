import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/db';

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function parseJSON(text: string, fallback: unknown) {
  try {
    const m = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
    return m ? JSON.parse(m[0]) : fallback;
  } catch { return fallback; }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const form = await req.formData();
    const tab = form.get('tab') as string;
    const file = form.get('file') as File;

    if (!tab || !file) return NextResponse.json({ error: 'tab and file required' }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const b64 = Buffer.from(bytes).toString('base64');
    const mediaType = (file.type || 'image/png') as 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp';

    const imgBlock = { type: 'image' as const, source: { type: 'base64' as const, media_type: mediaType, data: b64 } };

    const race = await prisma.race.findUnique({ where: { id }, include: { horses: { orderBy: { postPosition: 'asc' } } } });
    if (!race) return NextResponse.json({ error: 'Race not found' }, { status: 404 });

    const raceNum = race.number;
    let extracted: Record<string, unknown> = {};

    if (tab === 'advanced') {
      const msg = await claude.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        messages: [{ role: 'user', content: [imgBlock, { type: 'text', text: `TwinSpires Advanced tab Race ${raceNum}. Extract ALL horses including scratched entries. Return ONLY valid JSON:
{"distance":"6f","surface":"dirt","raceType":"claiming","horses":[{"postPosition":1,"horseName":"Name","morningLineOdds":"8/5","jockeyName":"Smith, J","jockeyWinPct":20,"trainerName":"Jones, B","trainerWinPct":15,"daysOff":14,"scratched":false}]}
surface: dirt|turf|synthetic  raceType: claiming|maiden|maiden-claiming|allowance|stakes|handicap|optional-claiming  Return ONLY the JSON.` }] }],
      });
      const textBlock = msg.content.find(b => b.type === 'text');
      extracted = parseJSON(textBlock && 'text' in textBlock ? textBlock.text : '', {}) as Record<string, unknown>;

      // Full replace of horses from advanced tab
      if (Array.isArray((extracted as { horses?: unknown[] }).horses) && (extracted as { horses: unknown[] }).horses.length > 0) {
        await prisma.horseEntry.deleteMany({ where: { raceId: id } });
        await prisma.horseEntry.createMany({
          data: ((extracted as { horses: { postPosition: number; horseName: string; morningLineOdds?: string; jockeyName?: string; jockeyWinPct?: number; trainerName?: string; trainerWinPct?: number; daysOff?: number; scratched?: boolean }[] }).horses).map(h => ({
            raceId: id,
            postPosition: h.postPosition ?? 0,
            horseName: h.horseName ?? '',
            morningLineOdds: h.morningLineOdds ?? null,
            jockeyName: h.jockeyName ?? null,
            jockeyWinPct: h.jockeyWinPct ?? null,
            trainerName: h.trainerName ?? null,
            trainerWinPct: h.trainerWinPct ?? null,
            daysOff: h.daysOff ?? null,
            scratched: h.scratched ?? false,
          })),
        });
        // Update race metadata
        await prisma.race.update({
          where: { id },
          data: {
            distance: (extracted as { distance?: string }).distance || race.distance,
            surface: (extracted as { surface?: string }).surface || race.surface,
            raceType: (extracted as { raceType?: string }).raceType || race.raceType,
          },
        });
        extracted = { ...extracted, count: (extracted as { horses: unknown[] }).horses.length };
      }
    } else {
      // Stats tabs: speed, class, pace, summary, tips
      const prompts: Record<string, string> = {
        speed: `Speed tab Race ${raceNum}. Extract speed figures (multi-digit Beyer-style numbers 50-115, NOT rank 1-8). Return ONLY JSON array: [{"horseName":"Name","bestSpeed":95,"backSpeed":88,"speedLR":90,"avgSpeed":87}]`,
        class: `Class tab Race ${raceNum}. Return ONLY JSON array: [{"horseName":"Name","primePower":145.2,"avgClass":95,"lastClass":100}]`,
        pace: `Pace tab Race ${raceNum}. Return ONLY JSON array: [{"horseName":"Name","earlyPace1":45.2,"earlyPace2":47.8,"latePace":35.4,"avgDistance":6.0}]`,
        summary: `Summary tab Race ${raceNum}. Extract Run Style for each horse. Return ONLY JSON array: [{"horseName":"Name","runStyle":"E"}] runStyle: E=Early, P=Presser, S=Stalker, C=Closer`,
        tips: `Tips tab Race ${raceNum}. Extract Angles for each horse. Return ONLY JSON array: [{"horseName":"Name","angles":"Hot Jockey, Key Trainer"}] null if no angles.`,
      };

      const prompt = prompts[tab];
      if (!prompt) return NextResponse.json({ error: `Unknown tab: ${tab}` }, { status: 400 });

      const msg = await claude.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 3000,
        messages: [{ role: 'user', content: [imgBlock, { type: 'text', text: prompt }] }],
      });

      const textBlock2 = msg.content.find(b => b.type === 'text');
      const rows = parseJSON(textBlock2 && 'text' in textBlock2 ? textBlock2.text : '', []) as Record<string, unknown>[];
      const fieldMap: Record<string, string[]> = {
        speed:   ['bestSpeed', 'backSpeed', 'speedLR', 'avgSpeed'],
        class:   ['primePower', 'avgClass', 'lastClass'],
        pace:    ['earlyPace1', 'earlyPace2', 'latePace', 'avgDistance'],
        summary: ['runStyle'],
        tips:    ['angles'],
      };
      const fields = fieldMap[tab] ?? [];

      let updated = 0;
      for (const row of rows) {
        const rowName = (row.horseName as string ?? '').toLowerCase();
        const horse = race.horses.find(h => {
          const n = h.horseName.toLowerCase();
          return n === rowName || n.includes(rowName.split(' ')[0]) || rowName.includes(n.split(' ')[0]);
        });
        if (!horse) continue;

        const data: Record<string, unknown> = {};
        for (const f of fields) if (row[f] !== undefined && row[f] !== null) data[f] = row[f];
        if (Object.keys(data).length === 0) continue;

        const count = await prisma.horseEntry.updateMany({ where: { id: horse.id, raceId: id }, data });
        updated += count.count;
      }
      extracted = { rowsExtracted: rows.length, horsesUpdated: updated };
    }

    const updatedRace = await prisma.race.findUnique({ where: { id }, include: { horses: { orderBy: { postPosition: 'asc' } } } });
    return NextResponse.json({ tab, extracted, horses: updatedRace?.horses ?? [] });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
