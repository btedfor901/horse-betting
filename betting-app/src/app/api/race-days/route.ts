import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const days = await prisma.raceDay.findMany({
      orderBy: { date: 'desc' },
      take: 60,
      where: { date: { gte: cutoff.toISOString().split('T')[0] } },
      include: {
        races: {
          select: {
            id: true,
            number: true,
            distance: true,
            surface: true,
            postTime: true,
            result: { select: { profitLoss: true, betPlaced: true } },
            recommendation: { select: { betType: true, totalCost: true } },
            _count: { select: { scores: true } },
          },
          orderBy: { number: 'asc' },
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
