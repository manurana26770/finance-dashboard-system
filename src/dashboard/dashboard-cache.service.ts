import { createHash } from 'crypto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { DashboardPeriod, DashboardScopeContext } from './dashboard.types';

type CachePayload = {
  kind: 'overview' | 'activity';
  filters: Record<string, unknown>;
  period: DashboardPeriod;
  scope: DashboardScopeContext;
};

const DEFAULT_ACTIVE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_HISTORICAL_TTL_MS = 15 * 60 * 1000;
const DEFAULT_VERSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class DashboardCacheService {
  private readonly activeTtlMs = Number(
    process.env.DASHBOARD_CACHE_ACTIVE_TTL_MS || DEFAULT_ACTIVE_TTL_MS,
  );

  private readonly historicalTtlMs = Number(
    process.env.DASHBOARD_CACHE_HISTORICAL_TTL_MS || DEFAULT_HISTORICAL_TTL_MS,
  );

  private readonly versionTtlMs = Number(
    process.env.DASHBOARD_CACHE_VERSION_TTL_MS || DEFAULT_VERSION_TTL_MS,
  );

  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  async getOrSetOverview<T>(
    scope: DashboardScopeContext,
    period: DashboardPeriod,
    filters: Record<string, unknown>,
    resolver: () => Promise<T>,
  ): Promise<T> {
    return this.getOrSet(
      { kind: 'overview', scope, period, filters },
      resolver,
    );
  }

  async getOrSetActivity<T>(
    scope: DashboardScopeContext,
    period: DashboardPeriod,
    filters: Record<string, unknown>,
    resolver: () => Promise<T>,
  ): Promise<T> {
    return this.getOrSet(
      { kind: 'activity', scope, period, filters },
      resolver,
    );
  }

  async invalidateForUser(userId: number): Promise<void> {
    const nextVersion = String(Date.now());

    await Promise.all([
      this.cache.set(
        this.getUserVersionKey(userId),
        nextVersion,
        this.versionTtlMs,
      ),
      this.cache.set(
        this.getAdministrativeVersionKey(),
        nextVersion,
        this.versionTtlMs,
      ),
    ]);
  }

  private async getOrSet<T>(
    payload: CachePayload,
    resolver: () => Promise<T>,
  ): Promise<T> {
    const version = await this.getVersion(payload.scope);
    const key = this.buildCacheKey(payload, version);
    const cached = await this.cache.get<T>(key);

    if (cached !== undefined) {
      return cached;
    }

    const value = await resolver();
    await this.cache.set(key, value, this.resolveTtl(payload.period));

    return value;
  }

  private async getVersion(scope: DashboardScopeContext): Promise<string> {
    const versionKey =
      scope.scope === 'me'
        ? this.getUserVersionKey(scope.scopeId as number)
        : this.getAdministrativeVersionKey();

    return (await this.cache.get<string>(versionKey)) ?? '0';
  }

  private buildCacheKey(payload: CachePayload, version: string): string {
    const filterHash = createHash('sha256')
      .update(JSON.stringify(payload.filters))
      .digest('hex');

    return [
      'dashboard',
      payload.kind,
      payload.scope.scope,
      String(payload.scope.scopeId),
      version,
      filterHash,
    ].join(':');
  }

  private resolveTtl(period: DashboardPeriod): number {
    const now = new Date();
    const isActivePeriod = period.startDate <= now && period.endDate >= now;

    return isActivePeriod ? this.activeTtlMs : this.historicalTtlMs;
  }

  private getUserVersionKey(userId: number): string {
    return `dashboard:version:me:${userId}`;
  }

  private getAdministrativeVersionKey(): string {
    return 'dashboard:version:administrative';
  }
}
