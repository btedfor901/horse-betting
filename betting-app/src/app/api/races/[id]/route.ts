import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const race = await prisma.race.findUnique({
      where: { id },
      include: {
        horses: { orderBy: { postPosition: 'asc' } },
        scores: true,
        recommendation: true,
        result: true,
        importLog: true,
      },
    });
    if (!race) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(race);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    // Update race metadata
    const { horses, ...raceFields } = body;
    await prisma.race.update({ where: { id }, data: raceFields });

    // Replace horses if provided
    if (horses && Array.isArray(horses)) {
      await prisma.horseEntry.deleteMany({ where: { raceId: id } });
      if (horses.length > 0) {
        await prisma.horseEntry.createMany({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: horses.map((h: Record<string, unknown>) => ({ ...h, raceId: id })) as any,
        });
      }
    }

    const race = await prisma.race.findUnique({
      where: { id },
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

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.race.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
