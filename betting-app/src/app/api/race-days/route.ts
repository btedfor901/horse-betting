import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const days = await prisma.raceDay.findMany({
      orderBy: { date: 'desc' },
      include: {
        races: {
          orderBy: { number: 'asc' },
          include: {
            horses: { orderBy: { postPosition: 'asc' } },
            scores: true,
            recommendation: true,
            result: true,
          },
        },
      },
    });
    return NextResponse.json(days);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { date, track = 'Churchill Downs' } = await req.json();
    if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 });

    const day = await prisma.raceDay.upsert({
      where: { date_track: { date, track } },
      create: { date, track },
      update: {},
      include: { races: true },
    });
    return NextResponse.json(day);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
