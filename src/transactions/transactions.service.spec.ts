import 'reflect-metadata';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  FinancialRecordStatus,
  FinancialRecordType,
  Role,
  StatusValue,
} from '@prisma/client';
import { DashboardCacheService } from '../dashboard/dashboard-cache.service';
import { CreateRecordType } from './dto/create-record.dto';
import { UpdateRecordStatus } from './dto/update-record.dto';
import { TransactionsService } from './transactions.service';

describe('TransactionsService', () => {
  const prisma = {
    financialRecord: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  } as {
    financialRecord: {
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  const dashboardCacheService = {
    invalidateForUser: jest.fn(async () => undefined),
  } as unknown as DashboardCacheService;

  let service: TransactionsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TransactionsService(
      prisma as never,
      dashboardCacheService,
    );
  });

  it('invalidates dashboard caches after record creation', async () => {
    (prisma.financialRecord.create as any).mockResolvedValue({
      id: 1,
      createdBy: 4,
    });

    await service.createRecord(4, {
      amount: 100,
      type: CreateRecordType.expense,
      category: 'software',
      date: '2026-04-04',
      notes: 'license',
    });

    expect(dashboardCacheService.invalidateForUser).toHaveBeenCalledWith(4);
  });

  it('invalidates dashboard caches after record approval updates', async () => {
    (prisma.financialRecord.findUnique as any).mockResolvedValue({
      id: 100,
      createdBy: 4,
      status: FinancialRecordStatus.PENDING,
    });
    (prisma.financialRecord.update as any).mockResolvedValue({
      id: 100,
      amount: 120,
      type: FinancialRecordType.EXPENSE,
      status: FinancialRecordStatus.APPROVED,
      category: 'travel',
      date: new Date('2026-04-04T00:00:00.000Z'),
      notes: null,
      description: null,
      createdAt: new Date('2026-04-04T08:00:00.000Z'),
      updatedAt: new Date('2026-04-04T08:05:00.000Z'),
      creator: {
        id: 4,
        email: 'owner@test.dev',
        firstName: 'Owner',
        lastName: 'User',
        role: Role.CLERK_SUBMITTER,
      },
      approver: {
        id: 3,
        email: 'approver@test.dev',
        firstName: 'Approver',
        lastName: 'User',
        role: Role.CONTROLLER_APPROVER,
      },
      deleter: null,
      approvedAt: new Date('2026-04-04T08:05:00.000Z'),
      deletedAt: null,
    });

    await service.updateRecord(
      {
        id: 3,
        sub: 3,
        email: 'approver@test.dev',
        role: Role.CONTROLLER_APPROVER,
        status: StatusValue.active,
        sessionVersion: 1,
      },
      100,
      { status: UpdateRecordStatus.approved },
    );

    expect(dashboardCacheService.invalidateForUser).toHaveBeenCalledWith(4);
  });
});
