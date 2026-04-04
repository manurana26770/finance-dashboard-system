import { Module } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AdministrativeDashboardController } from './administrative/administrative-dashboard.controller';
import { DashboardCacheService } from './dashboard-cache.service';
import { PersonalDashboardController } from './personal/personal-dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  controllers: [
    AdministrativeDashboardController,
    PersonalDashboardController,
  ],
  providers: [DashboardService, DashboardCacheService, PrismaService],
  exports: [DashboardCacheService, DashboardService],
})
export class DashboardModule {}
