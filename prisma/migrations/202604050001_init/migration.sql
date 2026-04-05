-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMINISTRATOR', 'ORCHESTRATOR', 'CONTROLLER_APPROVER', 'CLERK_SUBMITTER', 'ANALYST');

-- CreateEnum
CREATE TYPE "StatusValue" AS ENUM ('pending', 'active', 'suspended', 'inactive');

-- CreateEnum
CREATE TYPE "FinancialRecordType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "FinancialRecordStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DELETED');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "avatarUrl" TEXT,
    "timezone" TEXT,
    "passwordHash" TEXT,
    "refreshTokenHash" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "sessionVersion" INTEGER NOT NULL DEFAULT 1,
    "role" "Role" NOT NULL DEFAULT 'ANALYST',
    "roleId" INTEGER NOT NULL DEFAULT 4,
    "status" "StatusValue" NOT NULL DEFAULT 'active',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "inviteTokenJti" TEXT,
    "inviteExpiresAt" TIMESTAMP(3),
    "department" TEXT,
    "reportingManager" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialRecord" (
    "id" SERIAL NOT NULL,
    "createdBy" INTEGER NOT NULL,
    "approvedBy" INTEGER,
    "deletedBy" INTEGER,
    "amount" DECIMAL(14,2) NOT NULL,
    "type" "FinancialRecordType" NOT NULL,
    "status" "FinancialRecordStatus" NOT NULL DEFAULT 'PENDING',
    "category" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "description" TEXT,
    "approvedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "FinancialRecord_createdBy_idx" ON "FinancialRecord"("createdBy");

-- CreateIndex
CREATE INDEX "FinancialRecord_approvedBy_idx" ON "FinancialRecord"("approvedBy");

-- CreateIndex
CREATE INDEX "FinancialRecord_deletedBy_idx" ON "FinancialRecord"("deletedBy");

-- CreateIndex
CREATE INDEX "FinancialRecord_createdBy_date_idx" ON "FinancialRecord"("createdBy", "date");

-- CreateIndex
CREATE INDEX "FinancialRecord_createdBy_category_idx" ON "FinancialRecord"("createdBy", "category");

-- CreateIndex
CREATE INDEX "FinancialRecord_createdBy_type_idx" ON "FinancialRecord"("createdBy", "type");

-- CreateIndex
CREATE INDEX "FinancialRecord_createdBy_type_category_date_idx" ON "FinancialRecord"("createdBy", "type", "category", "date");

-- AddForeignKey
ALTER TABLE "FinancialRecord" ADD CONSTRAINT "FinancialRecord_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialRecord" ADD CONSTRAINT "FinancialRecord_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialRecord" ADD CONSTRAINT "FinancialRecord_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
