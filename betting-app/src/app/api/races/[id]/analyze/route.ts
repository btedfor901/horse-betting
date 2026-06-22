import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { scoreField, getRecommendation } from '@/lib/scoring';
import { Horse } from '@/lib/types';

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const race = await prisma.race.findUnique({
      where: { id },
      include: { horses: true },
    });

    if (!race) return NextResponse.json({ error: 'Race not found' }, { status: 404 });
    if (race.horses.length === 0) return NextResponse.json({ error: 'No horses to score' }, { status: 400 });

    // Map DB horses to the scoring engine's Horse type
    const horses: Horse[] = race.horses.map(h => ({
      id: h.id,
      name: h.horseName,
      postPosition: h.postPosition,
      morningLineOdds: h.morningLineOdds ?? '',
      currentOdds: h.currentOdds ?? '',
      jockeyName: h.jockeyName ?? '',
      jockeyWinPct: h.jockeyWinPct,
      trainerName: h.trainerName ?? '',
      trainerWinPct: h.trainerWinPct,
      runStyle: (h.runStyle ?? '') as Horse['runStyle'],
      daysOff: h.daysOff,
      avgSpeed: h.avgSpeed,
      bestSpeed: h.bestSpeed,
      backSpeed: h.backSpeed,
      speedLR: h.speedLR,
      primePower: h.primePower,
      avgClass: h.avgClass,
      lastClass: h.lastClass,
      earlyPace1: h.earlyPace1,
      earlyPace2: h.earlyPace2,
      latePace: h.latePace,
      avgDistance: h.avgDistance,
      angles: h.angles ?? '',
      scratched: h.scratched,
    }));

    const settings = await prisma.appSettings.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton' },
      update: {},
    });

    const scores = scoreField(horses, race.distance);
    const rec = getRecommendation(horses, scores, {
      startingBankroll: settings.startingBankroll,
      currentBankroll: settings.currentBankroll,
      unitSize: settings.unitSize,
      maxBetPerRace: settings.maxBetPerRace,
      dailyStopLoss: settings.dailyStopLoss,
      dailyProfitTarget: settings.dailyProfitTarget,
      maxBetsPerDay: settings.maxBetsPerDay,
    });

    // Persist scores (upsert per horse)
    await prisma.modelScore.deleteMany({ where: { raceId: id } });
    await prisma.$transaction(
      scores.map(s =>
        prisma.modelScore.create({
          data: {
            raceId: id,
            horseEntryId: s.horseId,
            speedScore: s.speedScore,
            classScore: s.classScore,
            formScore: s.formScore,
            paceScore: s.paceScore,
            jockeyScore: s.jockeyScore,
            trainerScore: s.trainerScore,
            postScore: s.postScore,
            valueScore: s.valueScore,
            totalScore: s.totalScore,
            rank: s.rank,
            confidence: s.confidence,
            modelProbability: s.modelProbability,
            impliedProbability: s.impliedProbability,
            valueRating: s.valueRating,
          },
        })
      )
    );

    // Persist recommendation (upsert)
    await prisma.betRecommendation.upsert({
      where: { raceId: id },
      create: {
        raceId: id,
        betType: rec.betType,
        horses: JSON.stringify(rec.horses),
        horseIds: JSON.stringify(rec.horseIds),
        totalCost: rec.totalCost,
        costPerCombination: rec.costPerCombination,
        confidence: rec.confidence,
        reasoning: rec.reasoning,
        scoreLead: rec.scoreLead,
      },
      update: {
        betType: rec.betType,
        horses: JSON.stringify(rec.horses),
        horseIds: JSON.stringify(rec.horseIds),
        totalCost: rec.totalCost,
        costPerCombination: rec.costPerCombination,
        confidence: rec.confidence,
        reasoning: rec.reasoning,
        scoreLead: rec.scoreLead,
      },
    });

    return NextResponse.json({
      scores,
      recommendation: {
        ...rec,
        horses: rec.horses,
        horseIds: rec.horseIds,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
