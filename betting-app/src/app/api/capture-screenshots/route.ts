import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

// Root of the Horse Betting project (one level up from betting-app)
const PROJECT_ROOT = path.join(process.cwd(), '..');

export async function POST(req: Request) {
  try {
    const { tracks, date, liveOnly = false } = await req.json() as {
      tracks: string[];
      date?: string;
      liveOnly?: boolean;
    };

    if (!tracks || tracks.length === 0) {
      return NextResponse.json({ error: 'tracks required' }, { status: 400 });
    }

    // Run the screenshot script as a child process
    // Pass tracks as JSON so the script can read them from argv
    const child = spawn(
      'node',
      [
        path.join(PROJECT_ROOT, 'grab-screenshots.mjs'),
        '--tracks', JSON.stringify(tracks),
        ...(date ? ['--date', date] : []),
        ...(liveOnly ? ['--live'] : []),
      ],
      {
        cwd: PROJECT_ROOT,
        detached: true,   // let it run independently
        stdio: 'ignore',  // don't block the response waiting for output
      }
    );

    child.unref();

    return NextResponse.json({
      ok: true,
      message: `Screenshot capture started for: ${tracks.join(', ')}`,
      tracks,
      date: date ?? new Date().toLocaleDateString('en-CA'),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
