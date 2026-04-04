import { PrismaClient, Role, StatusValue } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const seedUsers = [
  {
    email: 'admin@test.dev',
    firstName: 'Admin',
    lastName: 'User',
    role: Role.ADMINISTRATOR,
    roleId: 1,
    password: 'Admin@12345',
  },
  {
    email: 'orchestrator@test.dev',
    firstName: 'Orchestrator',
    lastName: 'User',
    role: Role.ORCHESTRATOR,
    roleId: 2,
    password: 'Orchestrator@12345',
  },
  {
    email: 'controller@test.dev',
    firstName: 'Controller',
    lastName: 'User',
    role: Role.CONTROLLER_APPROVER,
    roleId: 3,
    password: 'Controller@12345',
  },
  {
    email: 'clerk@test.dev',
    firstName: 'Clerk',
    lastName: 'User',
    role: Role.CLERK_SUBMITTER,
    roleId: 4,
    password: 'Clerk@12345',
  },
  {
    email: 'analyst@test.dev',
    firstName: 'Analyst',
    lastName: 'User',
    role: Role.ANALYST,
    roleId: 5,
    password: 'Analyst@12345',
  },
];

const seedRecords = [
  {
    createdByEmail: 'admin@test.dev',
    approvedByEmail: 'controller@test.dev',
    amount: 12500,
    type: 'INCOME' as const,
    status: 'APPROVED' as const,
    category: 'consulting',
    date: '2026-04-01T10:00:00.000Z',
    notes: 'SEED_SAMPLE_001 - consulting retainer',
    description: 'Monthly consulting retainer payment',
  },
  {
    createdByEmail: 'admin@test.dev',
    approvedByEmail: 'controller@test.dev',
    amount: 2400,
    type: 'EXPENSE' as const,
    status: 'APPROVED' as const,
    category: 'software',
    date: '2026-04-02T11:30:00.000Z',
    notes: 'SEED_SAMPLE_002 - software subscriptions',
    description: 'Team tools and software subscription fees',
  },
  {
    createdByEmail: 'orchestrator@test.dev',
    approvedByEmail: 'admin@test.dev',
    amount: 8600,
    type: 'INCOME' as const,
    status: 'APPROVED' as const,
    category: 'project',
    date: '2026-04-03T09:15:00.000Z',
    notes: 'SEED_SAMPLE_003 - project milestone',
    description: 'Project milestone billing received',
  },
  {
    createdByEmail: 'orchestrator@test.dev',
    approvedByEmail: 'controller@test.dev',
    amount: 3150,
    type: 'EXPENSE' as const,
    status: 'REJECTED' as const,
    category: 'travel',
    date: '2026-04-04T08:45:00.000Z',
    notes: 'SEED_SAMPLE_004 - travel request',
    description: 'Travel request rejected for policy reasons',
  },
  {
    createdByEmail: 'controller@test.dev',
    approvedByEmail: 'admin@test.dev',
    amount: 4100,
    type: 'EXPENSE' as const,
    status: 'APPROVED' as const,
    category: 'operations',
    date: '2026-04-05T14:00:00.000Z',
    notes: 'SEED_SAMPLE_005 - office operations',
    description: 'Office operations and facilities spend',
  },
  {
    createdByEmail: 'clerk@test.dev',
    approvedByEmail: undefined,
    amount: 980,
    type: 'EXPENSE' as const,
    status: 'PENDING' as const,
    category: 'supplies',
    date: '2026-04-06T12:00:00.000Z',
    notes: 'SEED_SAMPLE_006 - pending supply purchase',
    description: 'Stationery and supply purchase awaiting approval',
  },
  {
    createdByEmail: 'analyst@test.dev',
    approvedByEmail: 'controller@test.dev',
    amount: 1500,
    type: 'INCOME' as const,
    status: 'APPROVED' as const,
    category: 'refund',
    date: '2026-04-07T15:20:00.000Z',
    notes: 'SEED_SAMPLE_007 - customer refund',
    description: 'Refund recovered from vendor',
  },
];

async function main() {
  await prisma.financialRecord.deleteMany({
    where: {
      notes: {
        startsWith: 'SEED_SAMPLE_',
      },
    },
  });

  for (const seedUser of seedUsers) {
    const passwordHash = await bcrypt.hash(seedUser.password, 10);

    await prisma.user.upsert({
      where: { email: seedUser.email },
      create: {
        email: seedUser.email,
        firstName: seedUser.firstName,
        lastName: seedUser.lastName,
        passwordHash,
        role: seedUser.role,
        roleId: seedUser.roleId,
        status: StatusValue.active,
        isActive: true,
        sessionVersion: 1,
      },
      update: {
        firstName: seedUser.firstName,
        lastName: seedUser.lastName,
        passwordHash,
        role: seedUser.role,
        roleId: seedUser.roleId,
        status: StatusValue.active,
        isActive: true,
      },
    });
  }

  const seededUsers = await prisma.user.findMany({
    where: {
      email: {
        in: seedUsers.map((user) => user.email),
      },
    },
    select: {
      id: true,
      email: true,
    },
  });

  const userIdByEmail = new Map(seededUsers.map((user) => [user.email, user.id]));

  for (const record of seedRecords) {
    const createdBy = userIdByEmail.get(record.createdByEmail);
    const approvedBy = record.approvedByEmail
      ? userIdByEmail.get(record.approvedByEmail)
      : undefined;

    if (!createdBy) {
      throw new Error(`Missing seeded creator user: ${record.createdByEmail}`);
    }

    if (record.approvedByEmail && !approvedBy) {
      throw new Error(`Missing seeded approver user: ${record.approvedByEmail}`);
    }

    await prisma.financialRecord.create({
      data: {
        createdBy,
        approvedBy,
        amount: record.amount,
        type: record.type,
        status: record.status,
        category: record.category,
        date: new Date(record.date),
        notes: record.notes,
        description: record.description,
        approvedAt:
          record.status === 'APPROVED' || record.status === 'REJECTED'
            ? new Date(record.date)
            : null,
      },
    });
  }

  console.log(`Seeded ${seedUsers.length} users.`);
  console.log(`Seeded ${seedRecords.length} financial records.`);
  console.log('Login credentials:');
  for (const seedUser of seedUsers) {
    console.log(`${seedUser.email} / ${seedUser.password}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
