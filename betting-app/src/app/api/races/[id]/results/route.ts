import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const {
      winner,
      orderOfFinish,
      betPlaced,
      amountWagered,
      amountReturned,
      winPayout,
      placePayout,
      showPayout,
      exactaPayout,
      trifectaPayout,
      superfectaPayout,
      notes,
    } = body;

    const profitLoss = (amountReturned ?? 0) - (amountWagered ?? 0);

    const result = await prisma.raceResult.upsert({
      where: { raceId: id },
      create: {
        raceId: id,
        winner: winner ?? '',
        orderOfFinish: JSON.stringify(orderOfFinish ?? []),
        betPlaced: betPlaced ?? 'no-bet',
        amountWagered: amountWagered ?? 0,
        amountReturned: amountReturned ?? 0,
        profitLoss,
        winPayout,
        placePayout,
        showPayout,
        exactaPayout,
        trifectaPayout,
        superfectaPayout,
        notes,
      },
      update: {
        winner: winner ?? '',
        orderOfFinish: JSON.stringify(orderOfFinish ?? []),
        betPlaced: betPlaced ?? 'no-bet',
        amountWagered: amountWagered ?? 0,
        amountReturned: amountReturned ?? 0,
        profitLoss,
        winPayout,
        placePayout,
        showPayout,
        exactaPayout,
        trifectaPayout,
        superfectaPayout,
        notes,
      },
    });

    // Update bankroll
    if (profitLoss !== 0) {
      const settings = await prisma.appSettings.upsert({
        where: { id: 'singleton' },
        create: { id: 'singleton' },
        update: {},
      });
      await prisma.appSettings.update({
        where: { id: 'singleton' },
        data: { currentBankroll: settings.currentBankroll + profitLoss },
      });
    }

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
