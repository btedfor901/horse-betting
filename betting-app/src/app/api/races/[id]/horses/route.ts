import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const horses = await req.json();

    if (!Array.isArray(horses)) {
      return NextResponse.json({ error: 'Body must be an array of horses' }, { status: 400 });
    }

    // Delete all existing horses and scores for this race, then re-insert
    await prisma.modelScore.deleteMany({ where: { raceId: id } });
    await prisma.horseEntry.deleteMany({ where: { raceId: id } });

    const created = await prisma.$transaction(
      horses.map((h: Record<string, unknown>) =>
        prisma.horseEntry.create({
          data: {
            raceId: id,
            postPosition: (h.postPosition as number) ?? 1,
            horseName: (h.horseName as string) ?? '',
            programNumber: h.programNumber as string | undefined,
            morningLineOdds: h.morningLineOdds as string | undefined,
            currentOdds: h.currentOdds as string | undefined,
            jockeyName: h.jockeyName as string | undefined,
            jockeyWinPct: h.jockeyWinPct as number | undefined,
            trainerName: h.trainerName as string | undefined,
            trainerWinPct: h.trainerWinPct as number | undefined,
            owner: h.owner as string | undefined,
            weight: h.weight as number | undefined,
            medication: h.medication as string | undefined,
            equipment: h.equipment as string | undefined,
            runStyle: h.runStyle as string | undefined,
            daysOff: h.daysOff as number | undefined,
            avgSpeed: h.avgSpeed as number | undefined,
            bestSpeed: h.bestSpeed as number | undefined,
            backSpeed: h.backSpeed as number | undefined,
            speedLR: h.speedLR as number | undefined,
            primePower: h.primePower as number | undefined,
            avgClass: h.avgClass as number | undefined,
            lastClass: h.lastClass as number | undefined,
            earlyPace1: h.earlyPace1 as number | undefined,
            earlyPace2: h.earlyPace2 as number | undefined,
            latePace: h.latePace as number | undefined,
            avgDistance: h.avgDistance as number | undefined,
            angles: h.angles as string | undefined,
            scratched: (h.scratched as boolean) ?? false,
          },
        })
      )
    );

    return NextResponse.json(created);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
