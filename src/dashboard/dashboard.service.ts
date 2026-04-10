import { BadRequestException, Injectable } from '@nestjs/common';
import {
  FinancialRecordStatus,
  FinancialRecordType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import {
  DashboardOverviewQueryDto,
  DashboardTrendGranularity,
} from './dto/dashboard-overview-query.dto';
import { DashboardActivityQueryDto } from './dto/dashboard-activity-query.dto';
import { DashboardCacheService } from './dashboard-cache.service';
import { DashboardPeriod, DashboardScopeContext } from './dashboard.types';

type CategoryAggregateRow = {
  category: string;
  type: FinancialRecordType;
  _sum: {
    amount: Prisma.Decimal | null;
  };
};

type TrendAggregateRow = {
  bucket: Date;
  type: FinancialRecordType;
  total: string;
};

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dashboardCacheService: DashboardCacheService,
  ) {}

  async getMyOverview(
    user: AuthenticatedUser,
    query: DashboardOverviewQueryDto,
  ) {
    return this.getOverview({ scope: 'me', scopeId: user.id }, query);
  }

  async getAdministrativeOverview(query: DashboardOverviewQueryDto) {
    return this.getOverview(
      { scope: 'administrative', scopeId: 'all' },
      query,
    );
  }

  async getMyActivity(
    user: AuthenticatedUser,
    query: DashboardActivityQueryDto,
  ) {
    return this.getActivity({ scope: 'me', scopeId: user.id }, query);
  }

  async getAdministrativeActivity(query: DashboardActivityQueryDto) {
    return this.getActivity(
      { scope: 'administrative', scopeId: 'all' },
      query,
    );
  }

  async invalidateForRecordOwner(userId: number): Promise<void> {
    await this.dashboardCacheService.invalidateForUser(userId);
  }

  private async cgetOverview(
    scope: DashboardScopeContext,
    query: DashboardOverviewQueryDto,
  ) {
    const period = this.resolvePeriod(query);
    const granularity =
      query.granularity ?? DashboardTrendGranularity.week;
    const categoryLimit = query.categoryLimit ?? 10;
    const activityLimit = query.activityLimit ?? 5;

    return this.dashboardCacheService.getOrSetOverview(
      scope,
      period,
      {
        label: period.label,
        granularity,
        categoryLimit,
        activityLimit,
      },
      async () => {
        const approvedWhere = this.buildWhere(scope, period, true);
        const activityWhere = this.buildWhere(scope, period, false);

        const [totalsByType, categoryRows, trendRows, recentActivity] =
          await Promise.all([
            this.prisma.financialRecord.groupBy({
              by: ['type'],
              where: approvedWhere,
              _sum: { amount: true },
            }),
            this.prisma.financialRecord.groupBy({
              by: ['category', 'type'],
              where: approvedWhere,
              _sum: { amount: true },
            }),
            this.getTrendRows(scope, period, granularity),
            this.prisma.financialRecord.findMany({
              where: activityWhere,
              orderBy: [{ date: 'desc' }, { id: 'desc' }],
              take: activityLimit,
              select: {
                id: true,
                amount: true,
                type: true,
                status: true,
                category: true,
                date: true,
                notes: true,
                description: true,
                createdAt: true,
                updatedAt: true,
                createdBy: true,
                ...(scope.scope === 'administrative'
                  ? {
                      creator: {
                        select: {
                          id: true,
                          email: true,
                          firstName: true,
                          lastName: true,
                          role: true,
                        },
                      },
                    }
                  : {}),
              },
            }),
          ]);

        const totals = this.mapTotals(totalsByType);

        return {
          period: {
            label: period.label,
            startDate: period.startDate.toISOString(),
            endDate: period.endDate.toISOString(),
            granularity,
          },
          totals,
          categoryTotals: this.mapCategoryTotals(categoryRows, categoryLimit),
          trends: this.mapTrendTotals(trendRows),
          recentActivity: recentActivity.map((record) => ({
            id: record.id,
            amount: this.toAmount(record.amount),
            type: record.type,
            status: record.status,
            category: record.category,
            date: record.date,
            notes: record.notes,
            description: record.description,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
            ...(scope.scope === 'administrative'
              ? {
                  createdBy: record.createdBy,
                  creator: record.creator,
                }
              : {}),
          })),
        };
      },
    );
  }

  private async getActivity(
    scope: DashboardScopeContext,
    query: DashboardActivityQueryDto,
  ) {
    const period = this.resolvePeriod(query);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = this.buildWhere(scope, period, false);

    return this.dashboardCacheService.getOrSetActivity(
      scope,
      period,
      {
        label: period.label,
        page,
        limit,
      },
      async () => {
        const [records, total] = await Promise.all([
          this.prisma.financialRecord.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            orderBy: [{ date: 'desc' }, { id: 'desc' }],
            select: {
              id: true,
              amount: true,
              type: true,
              status: true,
              category: true,
              date: true,
              notes: true,
              description: true,
              createdAt: true,
              updatedAt: true,
              createdBy: true,
              ...(scope.scope === 'administrative'
                ? {
                    creator: {
                      select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        role: true,
                      },
                    },
                  }
                : {}),
            },
          }),
          this.prisma.financialRecord.count({ where }),
        ]);

        return {
          period: {
            label: period.label,
            startDate: period.startDate.toISOString(),
            endDate: period.endDate.toISOString(),
          },
          activity: records.map((record) => ({
            id: record.id,
            amount: this.toAmount(record.amount),
            type: record.type,
            status: record.status,
            category: record.category,
            date: record.date,
            notes: record.notes,
            description: record.description,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
            ...(scope.scope === 'administrative'
              ? {
                  createdBy: record.createdBy,
                  creator: record.creator,
                }
              : {}),
          })),
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.max(1, Math.ceil(total / limit)),
          },
        };
      },
    );
  }

  private buildWhere(
    scope: DashboardScopeContext,
    period: DashboardPeriod,
    approvedOnly: boolean,
  ): Prisma.FinancialRecordWhereInput {
    return {
      ...(scope.scope === 'me' ? { createdBy: scope.scopeId as number } : {}),
      date: {
        gte: period.startDate,
        lte: period.endDate,
      },
      ...(approvedOnly
        ? { status: FinancialRecordStatus.APPROVED }
        : {
            status: {
              not: FinancialRecordStatus.DELETED,
            },
          }),
    };
  }

  private async getTrendRows(
    scope: DashboardScopeContext,
    period: DashboardPeriod,
    granularity: DashboardTrendGranularity,
  ): Promise<TrendAggregateRow[]> {
    const bucketExpression =
      granularity === DashboardTrendGranularity.month
        ? Prisma.sql`DATE_TRUNC('month', "date")`
        : Prisma.sql`DATE_TRUNC('week', "date")`;

    const conditions = [
      Prisma.sql`"status" = ${FinancialRecordStatus.APPROVED}`,
      Prisma.sql`"date" >= ${period.startDate}`,
      Prisma.sql`"date" <= ${period.endDate}`,
    ];

    if (scope.scope === 'me') {
      conditions.push(
        Prisma.sql`"createdBy" = ${scope.scopeId as number}`,
      );
    }

    return this.prisma.$queryRaw<TrendAggregateRow[]>(Prisma.sql`
      SELECT
        ${bucketExpression} AS "bucket",
        "type",
        COALESCE(SUM("amount"), 0)::text AS "total"
      FROM "FinancialRecord"
      WHERE ${Prisma.join(conditions, ' AND ')}
      GROUP BY 1, 2
      ORDER BY 1 ASC
    `);
  }

  private mapTotals(
    rows: Array<{
      type: FinancialRecordType;
      _sum: { amount: Prisma.Decimal | null };
    }>,
  ) {
    const totals = rows.reduce(
      (acc, row) => {
        const amount = this.toAmount(row._sum.amount);
        if (row.type === FinancialRecordType.INCOME) {
          acc.totalIncome += amount;
        } else {
          acc.totalExpenses += amount;
        }

        return acc;
      },
      {
        totalIncome: 0,
        totalExpenses: 0,
      },
    );

    return {
      ...totals,
      netBalance: totals.totalIncome - totals.totalExpenses,
    };
  }

  private mapCategoryTotals(
    rows: CategoryAggregateRow[],
    limit: number,
  ) {
    const byCategory = new Map<
      string,
      {
        category: string;
        totalIncome: number;
        totalExpenses: number;
        total: number;
      }
    >();

    for (const row of rows) {
      const existing = byCategory.get(row.category) ?? {
        category: row.category,
        totalIncome: 0,
        totalExpenses: 0,
        total: 0,
      };
      const amount = this.toAmount(row._sum.amount);

      if (row.type === FinancialRecordType.INCOME) {
        existing.totalIncome += amount;
      } else {
        existing.totalExpenses += amount;
      }

      existing.total = existing.totalIncome + existing.totalExpenses;
      byCategory.set(row.category, existing);
    }

    return [...byCategory.values()]
      .sort((left, right) => right.total - left.total)
      .slice(0, limit);
  }

  private mapTrendTotals(rows: TrendAggregateRow[]) {
    const buckets = new Map<
      string,
      {
        bucketStart: string;
        totalIncome: number;
        totalExpenses: number;
        netBalance: number;
      }
    >();

    for (const row of rows) {
      const key = row.bucket.toISOString();
      const existing = buckets.get(key) ?? {
        bucketStart: key,
        totalIncome: 0,
        totalExpenses: 0,
        netBalance: 0,
      };
      const amount = Number(row.total);

      if (row.type === FinancialRecordType.INCOME) {
        existing.totalIncome += amount;
      } else {
        existing.totalExpenses += amount;
      }

      existing.netBalance = existing.totalIncome - existing.totalExpenses;
      buckets.set(key, existing);
    }

    return [...buckets.values()].sort((left, right) =>
      left.bucketStart.localeCompare(right.bucketStart),
    );
  }

  private resolvePeriod(
    query: Pick<
      DashboardOverviewQueryDto | DashboardActivityQueryDto,
      'month' | 'startDate' | 'endDate'
    >,
  ): DashboardPeriod {
    if (query.month && (query.startDate || query.endDate)) {
      throw new BadRequestException(
        'Use either month or startDate/endDate, not both',
      );
    }

    if (query.month) {
      const [yearText, monthText] = query.month.split('-');
      const year = Number(yearText);
      const month = Number(monthText);

      if (!year || month < 1 || month > 12) {
        throw new BadRequestException('Invalid month value');
      }

      return {
        label: query.month,
        startDate: new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0)),
        endDate: new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)),
      };
    }

    if (query.startDate || query.endDate) {
      if (!query.startDate || !query.endDate) {
        throw new BadRequestException(
          'Both startDate and endDate are required for custom ranges',
        );
      }

      const startDate = this.parseStartDate(query.startDate);
      const endDate = this.parseEndDate(query.endDate);

      if (startDate > endDate) {
        throw new BadRequestException(
          'startDate must be before or equal to endDate',
        );
      }

      return {
        label: `${query.startDate}:${query.endDate}`,
        startDate,
        endDate,
      };
    }

    const now = new Date();
    const month = `${now.getUTCFullYear()}-${String(
      now.getUTCMonth() + 1,
    ).padStart(2, '0')}`;

    return {
      label: month,
      startDate: new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
      ),
      endDate: new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth() + 1,
          0,
          23,
          59,
          59,
          999,
        ),
      ),
    };
  }

  private parseStartDate(input: string): Date {
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
      return new Date(`${input}T00:00:00.000Z`);
    }

    return new Date(input);
  }

  private parseEndDate(input: string): Date {
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
      return new Date(`${input}T23:59:59.999Z`);
    }

    return new Date(input);
  }

  private toAmount(value: Prisma.Decimal | null): number {
    if (!value) {
      return 0;
    }

    return Number(value.toString());
  }
}
