import { createKeyv } from '@keyv/redis';
import { CacheModule } from '@nestjs/cache-manager';
import { Global, Module } from '@nestjs/common';

const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => {
        const redisUrl = process.env.REDIS_URL?.trim();
        const ttl = Number(
          process.env.DASHBOARD_CACHE_ACTIVE_TTL_MS || DEFAULT_CACHE_TTL_MS,
        );

        if (!redisUrl) {
          return { ttl };
        }

        return {
          ttl,
          stores: [
            createKeyv(redisUrl, {
              namespace: 'finance-dashboard',
              throwOnConnectError: true,
              throwOnErrors: true,
            }),
          ],
        };
      },
    }),
  ],
  exports: [CacheModule],
})
export class AppCacheModule {}
