import { DataProvider } from './types';
import { csvProvider } from './csvProvider';
import { equibaseProvider } from './equibaseProvider';

const providers: Record<string, DataProvider> = {
  csv: csvProvider,
  equibase: equibaseProvider,
};

export function getProvider(source: string): DataProvider {
  return providers[source] ?? csvProvider;
}

export { parseCSV, CSV_TEMPLATE_HEADER, CSV_TEMPLATE_EXAMPLE } from './csvProvider';
export type { NormalizedRacecard, NormalizedRace, NormalizedHorse, ImportResult } from './types';
