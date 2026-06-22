import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const DEFAULTS = {
  startingBankroll: 1000,
  currentBankroll: 1000,
  unitSize: 20,
  maxBetPerRace: 40,
  dailyStopLoss: 100,
  dailyProfitTarget: 150,
  maxBetsPerDay: 5,
};

export async function GET() {
  try {
    const settings = await prisma.appSettings.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton', ...DEFAULTS },
      update: {},
    });
    return NextResponse.json(settings);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const settings = await prisma.appSettings.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton', ...DEFAULTS, ...body },
      update: body,
    });
    return NextResponse.json(settings);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
