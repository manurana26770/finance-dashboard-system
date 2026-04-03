import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role, StatusValue, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { AcceptInviteDto } from '../common/dto/accept-invite.dto';
import { InviteEmailService } from '../common/services/invite-email.service';
import { PrismaService } from '../common/prisma.service';
import { InviteUserDto } from './administrative/dto/invite-user.dto';
import { ListUsersQueryDto } from './administrative/dto/list-users-query.dto';
import { UpdateUserRoleDto } from './administrative/dto/update-user-role.dto';
import { UpdateUserStatusDto } from './administrative/dto/update-user-status.dto';

const ROLE_BY_ID: Record<number, Role> = {
	1: Role.ADMINISTRATOR,
	2: Role.ORCHESTRATOR,
	3: Role.CONTROLLER_APPROVER,
	4: Role.CLERK_SUBMITTER,
	5: Role.ANALYST,
};

const ROLE_FILTER_MAP: Record<string, Role> = {
	administrator: Role.ADMINISTRATOR,
	orchestrator: Role.ORCHESTRATOR,
	controller: Role.CONTROLLER_APPROVER,
	controller_approver: Role.CONTROLLER_APPROVER,
	approver: Role.CONTROLLER_APPROVER,
	clerk: Role.CLERK_SUBMITTER,
	clerk_submitter: Role.CLERK_SUBMITTER,
	submitter: Role.CLERK_SUBMITTER,
	analyst: Role.ANALYST,
};

const BCRYPT_ROUNDS = 10;

@Injectable()
export class UsersService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly jwtService: JwtService,
		private readonly inviteEmailService: InviteEmailService,
	) {}

	async inviteUser(inviteUserDto: InviteUserDto) {
		const email = inviteUserDto.email.toLowerCase().trim();
		const role = this.resolveRoleById(inviteUserDto.roleId);
		const { firstName, lastName } = this.splitName(inviteUserDto.name);
		const inviteJti = randomUUID();
		const inviteExpiresAt = this.getInviteExpiryDate();

		const existingUser = await this.prisma.user.findUnique({
			where: { email },
		});

		if (existingUser) {
			throw new ConflictException('User with this email already exists');
		}

		const user = await this.prisma.user.create({
			data: {
				email,
				firstName,
				lastName,
				role,
				roleId: inviteUserDto.roleId,
				status: StatusValue.pending,
				isActive: false,
				inviteTokenJti: inviteJti,
				inviteExpiresAt,
			},
		});

		const token = this.jwtService.sign(
			{
				sub: user.id,
				type: 'invite',
				jti: inviteJti,
			},
			{
				expiresIn: this.getInviteExpirySeconds(),
			},
		);

		const inviteLink = this.buildInviteLink(token);

		await this.inviteEmailService.sendInviteEmail(
			user.email,
			`${user.firstName} ${user.lastName}`.trim(),
			inviteLink,
		);

		return {
			message: 'User invited successfully',
			inviteExpiresAt,
			user: this.toResponse(user),
		};
	}

	async acceptInvite(acceptInviteDto: AcceptInviteDto) {
		const payload = this.verifyInviteToken(acceptInviteDto.token);

		if (!payload || payload.type !== 'invite' || !payload.sub || !payload.jti) {
			throw new ForbiddenException('Invite token is invalid');
		}

		const user = await this.getExistingUser(payload.sub);

		if (user.status !== StatusValue.pending) {
			throw new BadRequestException('Invite is no longer valid for this account');
		}

		if (!user.inviteTokenJti || user.inviteTokenJti !== payload.jti) {
			throw new ForbiddenException('Invite token does not match this user');
		}

		if (!user.inviteExpiresAt || user.inviteExpiresAt < new Date()) {
			throw new ForbiddenException('Invite token has expired');
		}

		const passwordHash = await bcrypt.hash(acceptInviteDto.password, BCRYPT_ROUNDS);

		await this.prisma.user.update({
			where: { id: user.id },
			data: {
				passwordHash,
				status: StatusValue.active,
				isActive: true,
				inviteTokenJti: null,
				inviteExpiresAt: null,
			},
		});

		return {
			message: 'Invite accepted. Account is now active.',
		};
	}

	async listUsers(query: ListUsersQueryDto) {
		const page = query.page ?? 1;
		const limit = query.limit ?? 20;

		const where = {
			...(query.status
				? { status: this.normalizeStatusFilter(query.status) }
				: {}),
			...(query.role ? { role: this.normalizeRoleFilter(query.role) } : {}),
		};

		const [users, total] = await Promise.all([
			this.prisma.user.findMany({
				where,
				skip: (page - 1) * limit,
				take: limit,
				orderBy: { id: 'asc' },
			}),
			this.prisma.user.count({ where }),
		]);

		return {
			users: users.map((user) => this.toResponse(user)),
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.max(1, Math.ceil(total / limit)),
			},
		};
	}

	async getUserById(id: number) {
		const user = await this.prisma.user.findUnique({
			where: { id },
		});

		if (!user) {
			throw new NotFoundException('User not found');
		}

		return this.toResponse(user);
	}

	async updateUserRole(id: number, updateUserRoleDto: UpdateUserRoleDto) {
		const user = await this.getExistingUser(id);
		const nextRole = this.resolveRoleById(updateUserRoleDto.roleId);

		if (
			user.role === Role.ADMINISTRATOR &&
			user.isActive &&
			nextRole !== Role.ADMINISTRATOR
		) {
			await this.ensureAnotherActiveAdministratorExists(id);
		}

		const updated = await this.prisma.user.update({
			where: { id },
			data: {
				role: nextRole,
				roleId: updateUserRoleDto.roleId,
			},
		});

		return this.toResponse(updated);
	}

	async updateUserStatus(id: number, updateUserStatusDto: UpdateUserStatusDto) {
		const user = await this.getExistingUser(id);
		const status = this.mapStatusFromApi(updateUserStatusDto.status);

		if (
			user.role === Role.ADMINISTRATOR &&
			user.isActive &&
			status !== StatusValue.active
		) {
			await this.ensureAnotherActiveAdministratorExists(id);
		}

		const updated = await this.prisma.user.update({
			where: { id },
			data: {
				status,
				isActive: status === StatusValue.active,
			},
		});

		return this.toResponse(updated);
	}

	private async getExistingUser(id: number): Promise<User> {
		const user = await this.prisma.user.findUnique({
			where: { id },
		});

		if (!user) {
			throw new NotFoundException('User not found');
		}

		return user;
	}

	private async ensureAnotherActiveAdministratorExists(currentUserId: number) {
		const activeAdminCount = await this.prisma.user.count({
			where: {
				role: Role.ADMINISTRATOR,
				isActive: true,
				id: { not: currentUserId },
			},
		});

		if (activeAdminCount < 1) {
			throw new BadRequestException(
				'Cannot perform this action on the last active administrator',
			);
		}
	}

	private resolveRoleById(roleId: number): Role {
		const role = ROLE_BY_ID[roleId];

		if (!role) {
			throw new BadRequestException('Invalid roleId');
		}

		return role;
	}

	private mapStatusFromApi(status: UpdateUserStatusDto['status']): StatusValue {
		if (status === 'ACTIVE') {
			return StatusValue.active;
		}

		if (status === 'SUSPENDED') {
			return StatusValue.suspended;
		}

		return StatusValue.inactive;
	}

	private normalizeStatusFilter(status: string): StatusValue {
		const normalized = status.toLowerCase().trim();

		if (normalized === 'active') {
			return StatusValue.active;
		}

		if (normalized === 'pending') {
			return StatusValue.pending;
		}

		if (normalized === 'suspended') {
			return StatusValue.suspended;
		}

		if (normalized === 'inactive' || normalized === 'deactivated') {
			return StatusValue.inactive;
		}

		throw new BadRequestException('Invalid status filter value');
	}

	private normalizeRoleFilter(role: string): Role {
		const normalized = role.toLowerCase().trim().replace(/[\s/]+/g, '_');
		const value = ROLE_FILTER_MAP[normalized];

		if (!value) {
			throw new BadRequestException('Invalid role filter value');
		}

		return value;
	}

	private splitName(name: string): { firstName: string; lastName: string } {
		const normalizedName = name.trim().replace(/\s+/g, ' ');

		if (!normalizedName) {
			throw new BadRequestException('name is required');
		}

		const parts = normalizedName.split(' ');
		const firstName = parts.shift() || '';
		const lastName = parts.join(' ');

		return { firstName, lastName };
	}

	private toResponse(user: User) {
		return {
			id: user.id,
			email: user.email,
			name: `${user.firstName} ${user.lastName}`.trim(),
			role: user.role,
			roleId: user.roleId,
			status: user.status,
			isActive: user.isActive,
			department: user.department,
			reportingManager: user.reportingManager,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt,
		};
	}

	private getInviteExpiryDate(): Date {
		const hours = Number(process.env.INVITE_EXPIRATION_HOURS || 48);
		return new Date(Date.now() + hours * 60 * 60 * 1000);
	}

	private getInviteExpirySeconds(): number {
		return Number(process.env.INVITE_EXPIRATION_HOURS || 48) * 60 * 60;
	}

	private verifyInviteToken(token: string) {
		try {
			return this.jwtService.verify<{ sub: number; type: string; jti: string }>(
				token,
				{
					secret: process.env.JWT_SECRET || 'dev-invite-secret',
				},
			);
		} catch {
			throw new ForbiddenException('Invite token is invalid or expired');
		}
	}

	private buildInviteLink(token: string): string {
		const frontendBaseUrl =
			process.env.FRONTEND_BASE_URL || 'http://localhost:3000';
		const encodedToken = encodeURIComponent(token);
		return `${frontendBaseUrl}/accept-invite?token=${encodedToken}`;
	}
}