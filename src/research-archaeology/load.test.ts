import { describe, expect, it } from 'vitest';
import { loadArchaeologyReport } from './load';
import { reportFixture } from './report-fixture';

describe('loadArchaeologyReport', () => {
  it('uses anonymized fixture data by default', async () => {
    await expect(loadArchaeologyReport()).resolves.toBe(reportFixture);
  });

  it('loads the private report only through an explicit development URL', async () => {
    const privateReport = structuredClone(reportFixture);
    privateReport.idea.id = 'private-report';
    const fetchData = async (url: string) => {
      expect(url).toBe('/__private/archaeology-report.json');
      return privateReport;
    };

    await expect(
      loadArchaeologyReport({
        privateDataUrl: '/__private/archaeology-report.json',
        fetchData,
      }),
    ).resolves.toBe(privateReport);
  });
});
