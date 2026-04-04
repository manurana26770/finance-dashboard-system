import { Module } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { DashboardModule } from '../dashboard/dashboard.module';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

@Module({
  imports: [DashboardModule],
  controllers: [TransactionsController],
  providers: [TransactionsService, PrismaService],
})
export class TransactionsModule {}
