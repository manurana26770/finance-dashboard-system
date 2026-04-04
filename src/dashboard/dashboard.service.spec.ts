import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  FinancialRecordStatus,
  FinancialRecordType,
  Prisma,
  Role,
  StatusValue,
} from '@prisma/client';
import { DashboardCacheService } from './dashboard-cache.service';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  const prisma = {
    financialRecord: {
      groupBy: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $queryRaw: jest.fn(),
  } as {
    financialRecord: {
      groupBy: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
    };
    $queryRaw: jest.Mock;
  };

  const dashboardCacheService = {
    getOrSetOverview: jest.fn(
      async (
        _scope: unknown,
        _period: unknown,
        _filters: unknown,
        resolver: () => Promise<unknown>,
      ) => resolver(),
    ),
    getOrSetActivity: jest.fn(
      async (
        _scope: unknown,
        _period: unknown,
        _filters: unknown,
        resolver: () => Promise<unknown>,
      ) => resolver(),
    ),
    invalidateForUser: jest.fn(async () => undefined),
  } as unknown as DashboardCacheService;

  let service: DashboardService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DashboardService(
      prisma as never,
      dashboardCacheService,
    );
  });

  it('builds overview totals, category totals, trends, and activity for a user scope', async () => {
    (prisma.financialRecord.groupBy as any)
      .mockResolvedValueOnce([
        {
          type: FinancialRecordType.INCOME,
          _sum: { amount: new Prisma.Decimal('1200.00') },
        },
        {
          type: FinancialRecordType.EXPENSE,
          _sum: { amount: new Prisma.Decimal('450.00') },
        },
      ])
      .mockResolvedValueOnce([
        {
          category: 'salary',
          type: FinancialRecordType.INCOME,
          _sum: { amount: new Prisma.Decimal('1200.00') },
        },
        {
          category: 'travel',
          type: FinancialRecordType.EXPENSE,
          _sum: { amount: new Prisma.Decimal('300.00') },
        },
        {
          category: 'travel',
          type: FinancialRecordType.INCOME,
          _sum: { amount: new Prisma.Decimal('50.00') },
        },
      ]);
    (prisma.$queryRaw as any).mockResolvedValue([
      {
        bucket: new Date('2026-04-01T00:00:00.000Z'),
        type: FinancialRecordType.INCOME,
        total: '700.00',
      },
      {
        bucket: new Date('2026-04-01T00:00:00.000Z'),
        type: FinancialRecordType.EXPENSE,
        total: '200.00',
      },
    ]);
    (prisma.financialRecord.findMany as any).mockResolvedValue([
      {
        id: 100,
        amount: new Prisma.Decimal('250.00'),
        type: FinancialRecordType.EXPENSE,
        status: FinancialRecordStatus.PENDING,
        category: 'travel',
        date: new Date('2026-04-04T00:00:00.000Z'),
        notes: 'hotel',
        description: null,
        createdAt: new Date('2026-04-04T08:00:00.000Z'),
        updatedAt: new Date('2026-04-04T08:00:00.000Z'),
        createdBy: 4,
      },
    ]);

    const result = await service.getMyOverview(
      {
        id: 4,
        sub: 4,
        email: 'user@test.dev',
        role: Role.ANALYST,
        status: StatusValue.active,
        sessionVersion: 1,
      },
      { month: '2026-04' },
    );

    expect(result.totals).toEqual({
      totalIncome: 1200,
      totalExpenses: 450,
      netBalance: 750,
    });
    expect(result.categoryTotals).toEqual([
      {
        category: 'salary',
        totalIncome: 1200,
        totalExpenses: 0,
        total: 1200,
      },
      {
        category: 'travel',
        totalIncome: 50,
        totalExpenses: 300,
        total: 350,
      },
    ]);
    expect(result.trends).toEqual([
      {
        bucketStart: '2026-04-01T00:00:00.000Z',
        totalIncome: 700,
        totalExpenses: 200,
        netBalance: 500,
      },
    ]);
    expect(result.recentActivity).toHaveLength(1);
    expect(prisma.financialRecord.groupBy).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          createdBy: 4,
          status: FinancialRecordStatus.APPROVED,
        }),
      }),
    );
    expect(prisma.financialRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdBy: 4,
          status: { not: FinancialRecordStatus.DELETED },
        }),
      }),
    );
  });

  it('returns paginated administrative activity without a user filter', async () => {
    (prisma.financialRecord.findMany as any).mockResolvedValue([
      {
        id: 101,
        amount: new Prisma.Decimal('900.00'),
        type: FinancialRecordType.INCOME,
        status: FinancialRecordStatus.APPROVED,
        category: 'salary',
        date: new Date('2026-04-02T00:00:00.000Z'),
        notes: null,
        description: null,
        createdAt: new Date('2026-04-02T08:00:00.000Z'),
        updatedAt: new Date('2026-04-02T08:00:00.000Z'),
        createdBy: 7,
        creator: {
          id: 7,
          email: 'creator@test.dev',
          firstName: 'Creator',
          lastName: 'User',
          role: 'CLERK_SUBMITTER',
        },
      },
    ]);
    (prisma.financialRecord.count as any).mockResolvedValue(1);

    const result = await service.getAdministrativeActivity({
      month: '2026-04',
      page: 1,
      limit: 10,
    });

    expect(result.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    });
    expect(prisma.financialRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ createdBy: expect.any(Number) }),
      }),
    );
  });
});
