import { reportFixture } from './report-fixture';
import type { ArchaeologyReport } from './types';

type LoadArchaeologyReportOptions = {
  privateDataUrl?: string;
  fetchData?: (url: string) => Promise<ArchaeologyReport>;
};

async function fetchArchaeologyReport(url: string): Promise<ArchaeologyReport> {
  const response = await fetch(url, { credentials: 'same-origin' });
  if (!response.ok) {
    throw new Error(`Unable to load private archaeology report: ${response.status}`);
  }
  return (await response.json()) as ArchaeologyReport;
}

export async function loadArchaeologyReport(
  options: LoadArchaeologyReportOptions = {},
): Promise<ArchaeologyReport> {
  if (!options.privateDataUrl) return reportFixture;
  return (options.fetchData ?? fetchArchaeologyReport)(options.privateDataUrl);
}
