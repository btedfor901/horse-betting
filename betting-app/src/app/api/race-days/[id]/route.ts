import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const day = await prisma.raceDay.findUnique({
      where: { id },
      include: {
        races: {
          orderBy: { number: 'asc' },
          include: {
            horses: { orderBy: { postPosition: 'asc' } },
            scores: true,
            recommendation: true,
            result: true,
            importLog: true,
          },
        },
      },
    });
    if (!day) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(day);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.raceDay.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
