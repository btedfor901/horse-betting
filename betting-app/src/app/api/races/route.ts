import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { raceDayId, number, distance, surface, raceType, postTime, purse, conditions } = body;

    if (!raceDayId || !number || !distance || !surface || !raceType) {
      return NextResponse.json({ error: 'raceDayId, number, distance, surface, raceType required' }, { status: 400 });
    }

    const race = await prisma.race.upsert({
      where: { raceDayId_number: { raceDayId, number } },
      create: { raceDayId, number, distance, surface, raceType, postTime, purse, conditions },
      update: { distance, surface, raceType, postTime, purse, conditions },
      include: {
        horses: { orderBy: { postPosition: 'asc' } },
        scores: true,
        recommendation: true,
        result: true,
      },
    });
    return NextResponse.json(race);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
