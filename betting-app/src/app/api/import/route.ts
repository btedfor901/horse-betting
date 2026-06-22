import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { parseCSV } from '@/lib/dataProviders';
import { getProvider } from '@/lib/dataProviders';
import { NormalizedRace } from '@/lib/dataProviders/types';

// POST /api/import
// Body (multipart or JSON):
//   source: 'csv' | 'equibase'
//   date: 'YYYY-MM-DD'
//   track: 'Churchill Downs'
//   csvText?: string       (for source=csv)
//   raceNumber?: number    (import single race; omit for all races)

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') ?? '';

    let source = 'csv';
    let date = '';
    let track = 'Churchill Downs';
    let csvText = '';
    let raceNumberFilter: number | null = null;

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      source = (form.get('source') as string) ?? 'csv';
      date = (form.get('date') as string) ?? '';
      track = (form.get('track') as string) ?? 'Churchill Downs';
      raceNumberFilter = form.get('raceNumber') ? parseInt(form.get('raceNumber') as string) : null;

      const file = form.get('file') as File | null;
      if (file) csvText = await file.text();
      else csvText = (form.get('csvText') as string) ?? '';
    } else {
      const body = await req.json();
      source = body.source ?? 'csv';
      date = body.date ?? '';
      track = body.track ?? 'Churchill Downs';
      csvText = body.csvText ?? '';
      raceNumberFilter = body.raceNumber ?? null;
    }

    if (!date) return NextResponse.json({ error: 'date required (YYYY-MM-DD)' }, { status: 400 });

    let importResult;

    if (source === 'csv') {
      if (!csvText) return NextResponse.json({ error: 'csvText or file required for CSV import' }, { status: 400 });
      importResult = parseCSV(csvText, date);
    } else {
      const provider = getProvider(source);
      importResult = await provider.fetchRacecard(track, date);
    }

    if (!importResult.success || !importResult.racecard) {
      return NextResponse.json({
        success: false,
        source,
        error: importResult.error ?? 'Import failed',
        rawData: importResult.rawData,
      }, { status: 422 });
    }

    const { racecard } = importResult;

    // Upsert race day
    const raceDay = await prisma.raceDay.upsert({
      where: { date_track: { date, track } },
      create: { date, track },
      update: {},
    });

    const racesToImport = raceNumberFilter
      ? racecard.races.filter(r => r.number === raceNumberFilter)
      : racecard.races;

    const importedRaces = [];

    for (const nr of racesToImport) {
      // Upsert the race
      const race = await prisma.race.upsert({
        where: { raceDayId_number: { raceDayId: raceDay.id, number: nr.number } },
        create: {
          raceDayId: raceDay.id,
          number: nr.number,
          postTime: nr.postTime,
          distance: nr.distance,
          surface: nr.surface,
          raceType: nr.raceType,
          purse: nr.purse,
          conditions: nr.conditions,
        },
        update: {
          postTime: nr.postTime,
          distance: nr.distance,
          surface: nr.surface,
          raceType: nr.raceType,
          purse: nr.purse,
          conditions: nr.conditions,
        },
      });

      // Replace horses
      await prisma.modelScore.deleteMany({ where: { raceId: race.id } });
      await prisma.horseEntry.deleteMany({ where: { raceId: race.id } });

      if (nr.horses.length > 0) {
        await prisma.horseEntry.createMany({
          data: nr.horses.map(h => ({
            raceId: race.id,
            programNumber: h.programNumber,
            postPosition: h.postPosition,
            horseName: h.horseName,
            morningLineOdds: h.morningLineOdds,
            currentOdds: h.currentOdds,
            jockeyName: h.jockeyName,
            jockeyWinPct: h.jockeyWinPct,
            trainerName: h.trainerName,
            trainerWinPct: h.trainerWinPct,
            owner: h.owner,
            weight: h.weight,
            medication: h.medication,
            equipment: h.equipment,
            runStyle: h.runStyle,
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
            angles: h.angles,
            scratched: h.scratched ?? false,
          })),
        });
      }

      // Log the import
      await prisma.dataImportLog.upsert({
        where: { raceId: race.id },
        create: {
          raceId: race.id,
          source,
          success: true,
          normalizedData: JSON.parse(JSON.stringify(nr)),
        },
        update: {
          source,
          success: true,
          importedAt: new Date(),
          normalizedData: JSON.parse(JSON.stringify(nr)),
        },
      });

      importedRaces.push({
        id: race.id,
        number: race.number,
        horsesImported: nr.horses.length,
      });
    }

    return NextResponse.json({
      success: true,
      raceDayId: raceDay.id,
      source,
      racesImported: importedRaces.length,
      races: importedRaces,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// GET /api/import/template — download the CSV template
export async function GET() {
  const { CSV_TEMPLATE_HEADER, CSV_TEMPLATE_EXAMPLE } = await import('@/lib/dataProviders');
  const body = [
    CSV_TEMPLATE_HEADER,
    '# Fill in one row per horse. raceNumber groups horses into races.',
    '# Repeat raceNumber for each horse in the same race.',
    '# distance/surface/raceType/postTime/purse/conditions come from the first row of each race group.',
    CSV_TEMPLATE_EXAMPLE,
  ].join('\n');

  return new Response(body, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="cd-picks-template.csv"',
    },
  });
}
