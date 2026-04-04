import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { DashboardCacheService } from './dashboard-cache.service';

describe('DashboardCacheService', () => {
  const cache = {
    get: jest.fn(),
    set: jest.fn(),
  } as {
    get: jest.Mock;
    set: jest.Mock;
  };

  let service: DashboardCacheService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DashboardCacheService(cache as never);
  });

  it('returns cached overview payload when present', async () => {
    const cachedValue = { totals: { totalIncome: 10 } };
    const resolver = jest.fn(async () => ({ ok: false }));

    (cache.get as any)
      .mockResolvedValueOnce('v1')
      .mockResolvedValueOnce(cachedValue);

    const result = await service.getOrSetOverview(
      { scope: 'me', scopeId: 4 },
      {
        label: '2026-04',
        startDate: new Date('2026-04-01T00:00:00.000Z'),
        endDate: new Date('2026-04-30T23:59:59.999Z'),
      },
      { label: '2026-04', granularity: 'week' },
      resolver,
    );

    expect(result).toEqual(cachedValue);
    expect(resolver).not.toHaveBeenCalled();
    expect(cache.set).not.toHaveBeenCalled();
  });

  it('uses the active TTL for a period that includes now', async () => {
    const now = new Date();

    (cache.get as any)
      .mockResolvedValueOnce('v2')
      .mockResolvedValueOnce(undefined);
    (cache.set as any).mockResolvedValue(undefined);

    await service.getOrSetOverview(
      { scope: 'administrative', scopeId: 'all' },
      {
        label: 'active-window',
        startDate: new Date(now.getTime() - 60_000),
        endDate: new Date(now.getTime() + 60_000),
      },
      { label: 'active-window', granularity: 'week' },
      async () => ({ ok: true }),
    );

    expect(cache.set).toHaveBeenCalledWith(
      expect.stringMatching(/^dashboard:overview:administrative:all:/),
      { ok: true },
      300000,
    );
  });

  it('bumps personal and administrative cache versions on invalidation', async () => {
    (cache.set as any).mockResolvedValue(undefined);

    await service.invalidateForUser(9);

    expect(cache.set).toHaveBeenCalledTimes(2);
    expect(cache.set).toHaveBeenNthCalledWith(
      1,
      'dashboard:version:me:9',
      expect.any(String),
      2592000000,
    );
    expect(cache.set).toHaveBeenNthCalledWith(
      2,
      'dashboard:version:administrative',
      expect.any(String),
      2592000000,
    );
  });
});
