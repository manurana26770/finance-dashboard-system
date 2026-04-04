import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import {
	Prisma,
	FinancialRecordStatus,
	FinancialRecordType,
	Role,
} from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { DashboardCacheService } from '../dashboard/dashboard-cache.service';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CreateRecordDto, CreateRecordType } from './dto/create-record.dto';
import {
	ListRecordsQueryDto,
	ListRecordsStatus,
	ListRecordsType,
} from './dto/list-records-query.dto';
import {
	UpdateRecordDto,
	UpdateRecordStatus,
	UpdateRecordType,
} from './dto/update-record.dto';

@Injectable()
export class TransactionsService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly dashboardCacheService: DashboardCacheService,
	) {}

	async createRecord(userId: number, dto: CreateRecordDto) {
		const record = await this.prisma.financialRecord.create({
			data: {
				createdBy: userId,
				amount: dto.amount,
				type: this.mapType(dto.type),
				status: FinancialRecordStatus.PENDING,
				category: dto.category.trim(),
				date: new Date(dto.date),
				notes: dto.notes?.trim() || null,
			},
		});

		await this.dashboardCacheService.invalidateForUser(userId);

		return record;
	}

	async listRecords(userId: number, query: ListRecordsQueryDto) {
		const page = query.page ?? 1;
		const limit = query.limit ?? 20;

		const where: Prisma.FinancialRecordWhereInput = {
			createdBy: userId,
			...(query.type ? { type: this.mapListType(query.type) } : {}),
			...(query.status
				? { status: this.mapListStatus(query.status) }
				: {
					status: {
						notIn: [FinancialRecordStatus.DELETED],
					},
				}),
			...(query.category
				? {
					category: {
						equals: query.category.trim(),
						mode: 'insensitive',
					},
				}
				: {}),
			...(query.startDate || query.endDate
				? {
					date: {
						...(query.startDate
							? { gte: this.parseStartDate(query.startDate) }
							: {}),
						...(query.endDate
							? { lte: this.parseEndDateInclusive(query.endDate) }
							: {}),
					},
				}
				: {}),
		};

		const [records, total] = await Promise.all([
			this.prisma.financialRecord.findMany({
				where,
				skip: (page - 1) * limit,
				take: limit,
				orderBy: [{ date: 'desc' }, { id: 'desc' }],
			}),
			this.prisma.financialRecord.count({ where }),
		]);

		return {
			records,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.max(1, Math.ceil(total / limit)),
			},
		};
	}

	async getRecordById(user: AuthenticatedUser, id: number) {
		const record = await this.prisma.financialRecord.findUnique({
			where: { id },
			include: {
				creator: {
					select: {
						id: true,
						email: true,
						firstName: true,
						lastName: true,
						role: true,
					},
				},
				approver: {
					select: {
						id: true,
						email: true,
						firstName: true,
						lastName: true,
						role: true,
					},
				},
				deleter: {
					select: {
						id: true,
						email: true,
						firstName: true,
						lastName: true,
						role: true,
					},
				},
			},
		});

		if (!record) {
			throw new NotFoundException('Record not found');
		}

		if (!this.canAccessRecord(user, record.createdBy)) {
			throw new ForbiddenException('You are not allowed to access this record');
		}

		return {
			id: record.id,
			amount: record.amount,
			type: record.type,
			status: record.status,
			category: record.category,
			date: record.date,
			notes: record.notes,
			description: record.description,
			createdAt: record.createdAt,
			updatedAt: record.updatedAt,
			auditTrail: {
				createdBy: record.creator,
				approvedBy: record.approver,
				approvedAt: record.approvedAt,
				deletedBy: record.deleter,
				deletedAt: record.deletedAt,
			},
		};
	}

	async updateRecord(user: AuthenticatedUser, id: number, dto: UpdateRecordDto) {
		if (Object.keys(dto).length === 0) {
			throw new BadRequestException(
				'At least one updatable field must be provided',
			);
		}

		const record = await this.prisma.financialRecord.findUnique({
			where: { id },
		});

		if (!record) {
			throw new NotFoundException('Record not found');
		}

		if (!this.canAccessRecord(user, record.createdBy)) {
			throw new ForbiddenException('You are not allowed to update this record');
		}

		this.validatePatchBusinessRules(user, record, dto);

		const data = this.buildUpdateData(user, record.createdBy, dto);

		const updated = await this.prisma.financialRecord.update({
			where: { id },
			data,
			include: {
				creator: {
					select: {
						id: true,
						email: true,
						firstName: true,
						lastName: true,
						role: true,
					},
				},
				approver: {
					select: {
						id: true,
						email: true,
						firstName: true,
						lastName: true,
						role: true,
					},
				},
				deleter: {
					select: {
						id: true,
						email: true,
						firstName: true,
						lastName: true,
						role: true,
					},
				},
			},
		});

		await this.dashboardCacheService.invalidateForUser(record.createdBy);

		return {
			id: updated.id,
			amount: updated.amount,
			type: updated.type,
			status: updated.status,
			category: updated.category,
			date: updated.date,
			notes: updated.notes,
			description: updated.description,
			createdAt: updated.createdAt,
			updatedAt: updated.updatedAt,
			auditTrail: {
				createdBy: updated.creator,
				approvedBy: updated.approver,
				approvedAt: updated.approvedAt,
				deletedBy: updated.deleter,
				deletedAt: updated.deletedAt,
			},
		};
	}

	async softDeleteRecord(user: AuthenticatedUser, id: number) {
		const record = await this.prisma.financialRecord.findUnique({
			where: { id },
		});

		if (!record) {
			throw new NotFoundException('Record not found');
		}

		if (!this.canSoftDeleteRecord(user, record.createdBy)) {
			throw new ForbiddenException('You are not allowed to delete this record');
		}

		const updated = await this.prisma.financialRecord.update({
			where: { id },
			data: {
				status: FinancialRecordStatus.DELETED,
				deleter: { connect: { id: user.id } },
				deletedAt: new Date(),
			},
			select: {
				id: true,
				status: true,
				deletedAt: true,
				updatedAt: true,
			},
		});

		await this.dashboardCacheService.invalidateForUser(record.createdBy);

		return {
			message: 'Record soft-deleted successfully',
			record: updated,
		};
	}

	private mapType(type: CreateRecordType): FinancialRecordType {
		return type === CreateRecordType.income
			? FinancialRecordType.INCOME
			: FinancialRecordType.EXPENSE;
	}

	private mapListType(type: ListRecordsType): FinancialRecordType {
		return type === ListRecordsType.income
			? FinancialRecordType.INCOME
			: FinancialRecordType.EXPENSE;
	}

	private mapListStatus(status: ListRecordsStatus): FinancialRecordStatus {
		if (status === ListRecordsStatus.deleted) {
			return FinancialRecordStatus.DELETED;
		}

		if (status === ListRecordsStatus.approved) {
			return FinancialRecordStatus.APPROVED;
		}

		if (status === ListRecordsStatus.rejected) {
			return FinancialRecordStatus.REJECTED;
		}

		return FinancialRecordStatus.PENDING;
	}

	private parseStartDate(input: string): Date {
		if (this.isDateOnly(input)) {
			return new Date(`${input}T00:00:00.000Z`);
		}

		return new Date(input);
	}

	private parseEndDateInclusive(input: string): Date {
		if (this.isDateOnly(input)) {
			return new Date(`${input}T23:59:59.999Z`);
		}

		return new Date(input);
	}

	private isDateOnly(input: string): boolean {
		return /^\d{4}-\d{2}-\d{2}$/.test(input);
	}

	private canAccessRecord(user: AuthenticatedUser, createdBy: number): boolean {
		if (
			user.role === Role.ADMINISTRATOR ||
			user.role === Role.ORCHESTRATOR ||
			user.role === Role.CONTROLLER_APPROVER
		) {
			return true;
		}

		return user.id === createdBy;
	}

	private canSoftDeleteRecord(
		user: AuthenticatedUser,
		createdBy: number,
	): boolean {
		if (
			user.role === Role.ADMINISTRATOR ||
			user.role === Role.ORCHESTRATOR
		) {
			return true;
		}

		return false;
	}

	private validatePatchBusinessRules(
		user: AuthenticatedUser,
		record: {
			createdBy: number;
			status: FinancialRecordStatus;
		},
		dto: UpdateRecordDto,
	): void {
		if (user.role === Role.CLERK_SUBMITTER) {
			if (record.createdBy !== user.id) {
				throw new ForbiddenException('Clerks can only update their own records');
			}

			if (record.status !== FinancialRecordStatus.PENDING) {
				throw new ForbiddenException(
					'Clerks can only edit records while status is PENDING',
				);
			}
		}

		if (user.role === Role.CONTROLLER_APPROVER) {
			if (
				dto.status === undefined ||
				(dto.status !== UpdateRecordStatus.approved &&
					dto.status !== UpdateRecordStatus.rejected)
			) {
				throw new ForbiddenException(
					'Controllers can only set status to approved or rejected',
				);
			}
		}
	}

	private buildUpdateData(
		user: AuthenticatedUser,
		recordOwnerId: number,
		dto: UpdateRecordDto,
	): Prisma.FinancialRecordUpdateInput {
		const allowedFields = this.getAllowedUpdateFields(user, recordOwnerId);
		const requestedFields = Object.keys(dto);

		const disallowed = requestedFields.filter(
			(field) => !allowedFields.has(field as keyof UpdateRecordDto),
		);

		if (disallowed.length > 0) {
			throw new ForbiddenException(
				`You cannot update fields: ${disallowed.join(', ')}`,
			);
		}

		const data: Prisma.FinancialRecordUpdateInput = {};

		if (dto.amount !== undefined) data.amount = dto.amount;
		if (dto.type !== undefined) data.type = this.mapUpdateType(dto.type);
		if (dto.category !== undefined) data.category = dto.category.trim();
		if (dto.date !== undefined) data.date = new Date(dto.date);
		if (dto.notes !== undefined) data.notes = dto.notes.trim() || null;
		if (dto.description !== undefined) {
			data.description = dto.description.trim() || null;
		}

		if (dto.status !== undefined) {
			const status = this.mapUpdateStatus(dto.status);
			data.status = status;
			if (status === FinancialRecordStatus.APPROVED) {
				data.approver = { connect: { id: user.id } };
				data.approvedAt = new Date();
			} else if (status === FinancialRecordStatus.REJECTED) {
				data.approver = { connect: { id: user.id } };
				data.approvedAt = new Date();
			} else {
				data.approver = { disconnect: true };
				data.approvedAt = null;
			}
		}

		return data;
	}

	private getAllowedUpdateFields(
		user: AuthenticatedUser,
		recordOwnerId: number,
	): Set<keyof UpdateRecordDto> {
		if (user.role === Role.ORCHESTRATOR) {
			return new Set<keyof UpdateRecordDto>([
				'amount',
				'type',
				'category',
				'date',
				'notes',
				'description',
				'status',
			]);
		}

		if (user.role === Role.CONTROLLER_APPROVER) {
			return new Set<keyof UpdateRecordDto>(['status']);
		}

		if (user.id !== recordOwnerId) {
			return new Set<keyof UpdateRecordDto>();
		}

		return new Set<keyof UpdateRecordDto>([
			'amount',
			'type',
			'category',
			'date',
			'notes',
			'description',
		]);
	}

	private mapUpdateType(type: UpdateRecordType): FinancialRecordType {
		return type === UpdateRecordType.income
			? FinancialRecordType.INCOME
			: FinancialRecordType.EXPENSE;
	}

	private mapUpdateStatus(status: UpdateRecordStatus): FinancialRecordStatus {
		if (status === UpdateRecordStatus.approved) {
			return FinancialRecordStatus.APPROVED;
		}

		if (status === UpdateRecordStatus.rejected) {
			return FinancialRecordStatus.REJECTED;
		}

		return FinancialRecordStatus.PENDING;
	}
}
