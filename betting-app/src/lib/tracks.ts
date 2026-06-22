export interface TrackConfig {
  name: string;
  location: string;
  /** Slug used in TwinSpires URL: /bet/program/classic/[slug]/[code]/[type]/ */
  twinSpiresSlug: string;
  twinSpiresCode: string;
  twinSpiresType: 'Thoroughbred' | 'Harness' | 'Quarter Horse';
}

export const TRACKS: TrackConfig[] = [
  {
    name: 'Churchill Downs',
    location: 'Louisville, KY',
    twinSpiresSlug: 'churchill-downs',
    twinSpiresCode: 'cd',
    twinSpiresType: 'Thoroughbred',
  },
  {
    name: 'Horseshoe Indianapolis',
    location: 'Indianapolis, IN',
    twinSpiresSlug: 'horseshoe-indianapolis',
    twinSpiresCode: 'ind',
    twinSpiresType: 'Thoroughbred',
  },
  {
    name: 'Oak Grove',
    location: 'Oak Grove, KY',
    twinSpiresSlug: 'oak-grove',
    twinSpiresCode: 'ogr',
    twinSpiresType: 'Harness',
  },
  {
    name: 'Presque Isle',
    location: 'Erie, PA',
    twinSpiresSlug: 'presque-isle',
    twinSpiresCode: 'pid',
    twinSpiresType: 'Thoroughbred',
  },
  {
    name: 'Louisiana Downs',
    location: 'Bossier City, LA',
    twinSpiresSlug: 'louisiana-downs',
    twinSpiresCode: 'evd',
    twinSpiresType: 'Thoroughbred',
  },
];

export function getTrack(name: string): TrackConfig | undefined {
  return TRACKS.find(t => t.name === name);
}
