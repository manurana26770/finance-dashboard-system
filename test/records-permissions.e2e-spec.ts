import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  FinancialRecordStatus,
  FinancialRecordType,
  Role,
  StatusValue,
} from '@prisma/client';
import request from 'supertest';
import { AuthenticatedUser } from '../src/auth/types/authenticated-user.type';
import { PrismaService } from '../src/common/prisma.service';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { RequestValidationPipe } from '../src/common/pipes/request-validation.pipe';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { TransactionsController } from '../src/transactions/transactions.controller';
import { TransactionsService } from '../src/transactions/transactions.service';

type UserProfile = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
};

type RecordEntity = {
  id: number;
  createdBy: number;
  approvedBy: number | null;
  deletedBy: number | null;
  amount: number;
  type: FinancialRecordType;
  status: FinancialRecordStatus;
  category: string;
  date: Date;
  notes: string | null;
  description: string | null;
  approvedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type MockFindUniqueArgs = {
  where: { id: number };
  include?: {
    creator?: { select: Record<string, boolean> };
    approver?: { select: Record<string, boolean> };
    deleter?: { select: Record<string, boolean> };
  };
};

type MockFindManyArgs = {
  where?: {
    createdBy?: number;
    status?: FinancialRecordStatus | { notIn?: FinancialRecordStatus[] };
  };
  skip?: number;
  take?: number;
};

type MockUpdateArgs = {
  where: { id: number };
  data: {
    amount?: number;
    type?: FinancialRecordType;
    status?: FinancialRecordStatus;
    category?: string;
    date?: Date;
    notes?: string | null;
    description?: string | null;
    approvedAt?: Date | null;
    deletedAt?: Date | null;
    approver?: { connect?: { id: number }; disconnect?: boolean };
    deleter?: { connect?: { id: number }; disconnect?: boolean };
  };
  include?: MockFindUniqueArgs['include'];
  select?: {
    id?: boolean;
    status?: boolean;
    deletedAt?: boolean;
    updatedAt?: boolean;
  };
};

type MockCreateArgs = {
  data: {
    createdBy: number;
    amount: number;
    type: FinancialRecordType;
    status: FinancialRecordStatus;
    category: string;
    date: Date;
    notes: string | null;
  };
};

class HeaderTestAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requestObj = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      user?: AuthenticatedUser;
    }>();

    const rawRole = requestObj.headers['x-test-role'];
    const rawUserId = requestObj.headers['x-test-user-id'];

    const roleValue = Array.isArray(rawRole) ? rawRole[0] : rawRole;
    const userIdValue = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId;

    if (!roleValue || !userIdValue) {
      throw new UnauthorizedException('Missing test auth headers');
    }

    const role = roleValue as Role;
    const id = Number(userIdValue);

    requestObj.user = {
      id,
      sub: id,
      email: `role-${role.toLowerCase()}@test.dev`,
      role,
      status: StatusValue.active,
      sessionVersion: 1,
    };

    return true;
  }
}

describe('Records Permission Matrix (e2e)', () => {
  let app: INestApplication;
  let records: RecordEntity[];

  const usersById: Record<number, UserProfile> = {
    1: {
      id: 1,
      email: 'admin@test.dev',
      firstName: 'Admin',
      lastName: 'User',
      role: Role.ADMINISTRATOR,
    },
    2: {
      id: 2,
      email: 'orchestrator@test.dev',
      firstName: 'Orchestrator',
      lastName: 'User',
      role: Role.ORCHESTRATOR,
    },
    3: {
      id: 3,
      email: 'controller@test.dev',
      firstName: 'Controller',
      lastName: 'User',
      role: Role.CONTROLLER_APPROVER,
    },
    4: {
      id: 4,
      email: 'clerk@test.dev',
      firstName: 'Clerk',
      lastName: 'User',
      role: Role.CLERK_SUBMITTER,
    },
    5: {
      id: 5,
      email: 'analyst@test.dev',
      firstName: 'Analyst',
      lastName: 'User',
      role: Role.ANALYST,
    },
  };

  const makeSeedRecords = (): RecordEntity[] => [
    {
      id: 100,
      createdBy: 4,
      approvedBy: null,
      deletedBy: null,
      amount: 1000,
      type: FinancialRecordType.EXPENSE,
      status: FinancialRecordStatus.PENDING,
      category: 'software',
      date: new Date('2026-04-01T00:00:00.000Z'),
      notes: 'pending clerk record',
      description: null,
      approvedAt: null,
      deletedAt: null,
      createdAt: new Date('2026-04-01T10:00:00.000Z'),
      updatedAt: new Date('2026-04-01T10:00:00.000Z'),
    },
    {
      id: 101,
      createdBy: 4,
      approvedBy: 3,
      deletedBy: null,
      amount: 2500,
      type: FinancialRecordType.EXPENSE,
      status: FinancialRecordStatus.APPROVED,
      category: 'travel',
      date: new Date('2026-04-02T00:00:00.000Z'),
      notes: 'approved clerk record',
      description: null,
      approvedAt: new Date('2026-04-02T12:00:00.000Z'),
      deletedAt: null,
      createdAt: new Date('2026-04-02T09:00:00.000Z'),
      updatedAt: new Date('2026-04-02T12:00:00.000Z'),
    },
    {
      id: 102,
      createdBy: 5,
      approvedBy: null,
      deletedBy: null,
      amount: 300,
      type: FinancialRecordType.INCOME,
      status: FinancialRecordStatus.PENDING,
      category: 'refund',
      date: new Date('2026-04-03T00:00:00.000Z'),
      notes: 'analyst own record',
      description: null,
      approvedAt: null,
      deletedAt: null,
      createdAt: new Date('2026-04-03T08:00:00.000Z'),
      updatedAt: new Date('2026-04-03T08:00:00.000Z'),
    },
  ];

  const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

  const toIncludedRecord = (record: RecordEntity, include?: MockFindUniqueArgs['include']) => {
    const base = clone(record) as Record<string, unknown>;

    if (include?.creator) {
      base.creator = usersById[record.createdBy] || null;
    }

    if (include?.approver) {
      base.approver = record.approvedBy ? usersById[record.approvedBy] : null;
    }

    if (include?.deleter) {
      base.deleter = record.deletedBy ? usersById[record.deletedBy] : null;
    }

    return base;
  };

  const applyWhereFilter = (
    source: RecordEntity[],
    where?: MockFindManyArgs['where'],
  ): RecordEntity[] => {
    let result = [...source];

    if (where?.createdBy !== undefined) {
      result = result.filter((record) => record.createdBy === where.createdBy);
    }

    if (where?.status !== undefined) {
      if (typeof where.status === 'string') {
        result = result.filter((record) => record.status === where.status);
      } else if (where.status.notIn) {
        const blocked = new Set(where.status.notIn);
        result = result.filter((record) => !blocked.has(record.status));
      }
    }

    return result;
  };

  const prismaMock: {
    financialRecord: {
      create: (args: MockCreateArgs) => Promise<RecordEntity>;
      findMany: (args: MockFindManyArgs) => Promise<RecordEntity[]>;
      count: (args: MockFindManyArgs) => Promise<number>;
      findUnique: (args: MockFindUniqueArgs) => Promise<Record<string, unknown> | null>;
      update: (args: MockUpdateArgs) => Promise<Record<string, unknown>>;
    };
  } = {
    financialRecord: {
      create: jest.fn(async (args: MockCreateArgs) => {
        const nextId = records.length
          ? Math.max(...records.map((record) => record.id)) + 1
          : 1;
        const now = new Date();

        const entity: RecordEntity = {
          id: nextId,
          createdBy: args.data.createdBy,
          approvedBy: null,
          deletedBy: null,
          amount: args.data.amount,
          type: args.data.type,
          status: args.data.status,
          category: args.data.category,
          date: args.data.date,
          notes: args.data.notes,
          description: null,
          approvedAt: null,
          deletedAt: null,
          createdAt: now,
          updatedAt: now,
        };

        records.push(entity);
        return clone(entity);
      }),
      findMany: jest.fn(async (args: MockFindManyArgs) => {
        const result = applyWhereFilter(records, args.where);

        const start = args.skip ?? 0;
        const end = (args.take ?? result.length) + start;
        return clone(result.slice(start, end));
      }),
      count: jest.fn(async (args: MockFindManyArgs) => {
        const rows = applyWhereFilter(records, args.where);
        return rows.length;
      }),
      findUnique: jest.fn(async (args: MockFindUniqueArgs) => {
        const record = records.find((item) => item.id === args.where.id);
        if (!record) return null;
        return toIncludedRecord(record, args.include);
      }),
      update: jest.fn(async (args: MockUpdateArgs) => {
        const index = records.findIndex((item) => item.id === args.where.id);
        if (index < 0) {
          throw new Error('Record not found in mock store');
        }

        const existing = records[index];

        const next: RecordEntity = {
          ...existing,
          amount: args.data.amount ?? existing.amount,
          type: args.data.type ?? existing.type,
          status: args.data.status ?? existing.status,
          category: args.data.category ?? existing.category,
          date: args.data.date ?? existing.date,
          notes: args.data.notes !== undefined ? args.data.notes : existing.notes,
          description:
            args.data.description !== undefined
              ? args.data.description
              : existing.description,
          approvedAt:
            args.data.approvedAt !== undefined
              ? args.data.approvedAt
              : existing.approvedAt,
          deletedAt:
            args.data.deletedAt !== undefined
              ? args.data.deletedAt
              : existing.deletedAt,
          updatedAt: new Date(),
          approvedBy: existing.approvedBy,
          deletedBy: existing.deletedBy,
        };

        if (args.data.approver?.connect?.id) {
          next.approvedBy = args.data.approver.connect.id;
        }
        if (args.data.approver?.disconnect) {
          next.approvedBy = null;
        }
        if (args.data.deleter?.connect?.id) {
          next.deletedBy = args.data.deleter.connect.id;
        }
        if (args.data.deleter?.disconnect) {
          next.deletedBy = null;
        }

        records[index] = next;

        if (args.select) {
          return {
            id: next.id,
            status: next.status,
            deletedAt: next.deletedAt,
            updatedAt: next.updatedAt,
          };
        }

        return toIncludedRecord(next, args.include);
      }),
    },
  };

  const authHeaders = (role: Role, userId: number): Record<string, string> => ({
    'x-test-role': role,
    'x-test-user-id': String(userId),
  });

  beforeEach(async () => {
    records = makeSeedRecords();

    const moduleRef = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [TransactionsService, PrismaService, RolesGuard],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideGuard(JwtAuthGuard)
      .useValue(new HeaderTestAuthGuard())
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new RequestValidationPipe());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('POST /records allows only ORCHESTRATOR and CLERK_SUBMITTER', async () => {
    const payload = {
      amount: 120.5,
      type: 'expense',
      category: 'software',
      date: '2026-04-05',
      notes: 'license',
    };

    await request(app.getHttpServer())
      .post('/api/v1/records')
      .set(authHeaders(Role.ORCHESTRATOR, 2))
      .send(payload)
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/records')
      .set(authHeaders(Role.CLERK_SUBMITTER, 4))
      .send(payload)
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/records')
      .set(authHeaders(Role.ADMINISTRATOR, 1))
      .send(payload)
      .expect(403);

    await request(app.getHttpServer())
      .post('/api/v1/records')
      .set(authHeaders(Role.CONTROLLER_APPROVER, 3))
      .send(payload)
      .expect(403);

    await request(app.getHttpServer())
      .post('/api/v1/records')
      .set(authHeaders(Role.ANALYST, 5))
      .send(payload)
      .expect(403);
  });

  it('GET /records is allowed for all roles in matrix', async () => {
    for (const [role, userId] of [
      [Role.ADMINISTRATOR, 1],
      [Role.ORCHESTRATOR, 2],
      [Role.CONTROLLER_APPROVER, 3],
      [Role.CLERK_SUBMITTER, 4],
      [Role.ANALYST, 5],
    ] as const) {
      await request(app.getHttpServer())
        .get('/api/v1/records')
        .set(authHeaders(role, userId))
        .expect(200);
    }
  });

  it('GET /records/:id is allowed for all roles in matrix', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/records/100')
      .set(authHeaders(Role.ADMINISTRATOR, 1))
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/v1/records/100')
      .set(authHeaders(Role.ORCHESTRATOR, 2))
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/v1/records/100')
      .set(authHeaders(Role.CONTROLLER_APPROVER, 3))
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/v1/records/100')
      .set(authHeaders(Role.CLERK_SUBMITTER, 4))
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/v1/records/102')
      .set(authHeaders(Role.ANALYST, 5))
      .expect(200);
  });

  it('PATCH /records/:id enforces role matrix and business rules', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/records/100')
      .set(authHeaders(Role.ADMINISTRATOR, 1))
      .send({ amount: 200 })
      .expect(403);

    await request(app.getHttpServer())
      .patch('/api/v1/records/100')
      .set(authHeaders(Role.ORCHESTRATOR, 2))
      .send({ amount: 999.99, category: 'ops', status: 'approved' })
      .expect(200);

    await request(app.getHttpServer())
      .patch('/api/v1/records/100')
      .set(authHeaders(Role.CONTROLLER_APPROVER, 3))
      .send({ amount: 10 })
      .expect(403);

    await request(app.getHttpServer())
      .patch('/api/v1/records/100')
      .set(authHeaders(Role.CONTROLLER_APPROVER, 3))
      .send({ status: 'approved' })
      .expect(200);

    await request(app.getHttpServer())
      .patch('/api/v1/records/100')
      .set(authHeaders(Role.CLERK_SUBMITTER, 4))
      .send({ notes: 'fix typo' })
      .expect(403);

    await request(app.getHttpServer())
      .patch('/api/v1/records/101')
      .set(authHeaders(Role.CLERK_SUBMITTER, 4))
      .send({ amount: 22 })
      .expect(403);

    await request(app.getHttpServer())
      .patch('/api/v1/records/100')
      .set(authHeaders(Role.ANALYST, 5))
      .send({ amount: 10 })
      .expect(403);
  });

  it('PATCH /records/:id allows Clerk only on own PENDING record', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/records/100')
      .set(authHeaders(Role.CLERK_SUBMITTER, 4))
      .send({ amount: 111.5, notes: 'typo fixed' })
      .expect(200);
  });

  it('DELETE /records/:id allows only ADMINISTRATOR and ORCHESTRATOR', async () => {
    await request(app.getHttpServer())
      .delete('/api/v1/records/100')
      .set(authHeaders(Role.ADMINISTRATOR, 1))
      .expect(200);

    await request(app.getHttpServer())
      .delete('/api/v1/records/100')
      .set(authHeaders(Role.ORCHESTRATOR, 2))
      .expect(200);

    await request(app.getHttpServer())
      .delete('/api/v1/records/100')
      .set(authHeaders(Role.CONTROLLER_APPROVER, 3))
      .expect(403);

    await request(app.getHttpServer())
      .delete('/api/v1/records/100')
      .set(authHeaders(Role.CLERK_SUBMITTER, 4))
      .expect(403);

    await request(app.getHttpServer())
      .delete('/api/v1/records/100')
      .set(authHeaders(Role.ANALYST, 5))
      .expect(403);
  });
});
