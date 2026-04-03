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
import { ChangeMyPasswordDto } from './personal/dto/change-my-password.dto';
import { UpdateProfileMeDto } from './personal/dto/update-profile-me.dto';

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

const STATUS_FILTER_MAP: Record<string, StatusValue> = {
  active: StatusValue.active,
  pending: StatusValue.pending,
  suspended: StatusValue.suspended,
  inactive: StatusValue.inactive,
  deactivated: StatusValue.inactive,
};

const STATUS_FROM_API_MAP: Record<UpdateUserStatusDto['status'], StatusValue> =
  {
    ACTIVE: StatusValue.active,
    SUSPENDED: StatusValue.suspended,
    DEACTIVATED: StatusValue.inactive,
  };

const BCRYPT_ROUNDS = 10;
const DEFAULT_INVITE_HOURS = 48;

type InviteTokenPayload = {
  sub: number;
  type: string;
  jti: string;
};

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

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
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
      { sub: user.id, type: 'invite', jti: inviteJti },
      { expiresIn: this.getInviteExpirySeconds() },
    );

    await this.inviteEmailService.sendInviteEmail(
      user.email,
      `${user.firstName} ${user.lastName}`.trim(),
      this.buildInviteLink(token),
    );

    return {
      message: 'User invited successfully',
      inviteExpiresAt,
      user: this.toResponse(user),
    };
  }

  async acceptInvite(acceptInviteDto: AcceptInviteDto) {
    const payload = this.verifyInviteToken(acceptInviteDto.inviteToken);
    if (payload.type !== 'invite' || !payload.sub || !payload.jti) {
      throw new ForbiddenException('Invite token is invalid');
    }

    const user = await this.getExistingUser(payload.sub);
    if (user.status !== StatusValue.pending) {
      throw new BadRequestException(
        'Invite is no longer valid for this account',
      );
    }

    if (!user.inviteTokenJti || user.inviteTokenJti !== payload.jti) {
      throw new ForbiddenException('Invite token does not match this user');
    }

    if (!user.inviteExpiresAt || user.inviteExpiresAt < new Date()) {
      throw new ForbiddenException('Invite token has expired');
    }

    const passwordHash = await bcrypt.hash(
      acceptInviteDto.password,
      BCRYPT_ROUNDS,
    );

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

    return { message: 'Invite accepted. Account is now active.' };
  }

  async getMyProfile(userId: number) {
    return this.toResponse(await this.getExistingUser(userId));
  }

  async updateMyProfile(userId: number, dto: UpdateProfileMeDto) {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException(
        'At least one profile field must be provided',
      );
    }

    await this.getExistingUser(userId);

    const data: Partial<
      Pick<User, 'firstName' | 'lastName' | 'phone' | 'avatarUrl' | 'timezone'>
    > = {};

    if (dto.firstName !== undefined) data.firstName = dto.firstName.trim();
    if (dto.lastName !== undefined) data.lastName = dto.lastName.trim();
    if (dto.phone !== undefined) data.phone = dto.phone.trim();
    if (dto.avatarUrl !== undefined) data.avatarUrl = dto.avatarUrl.trim();
    if (dto.timezone !== undefined) data.timezone = dto.timezone.trim();

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
    });

    return this.toResponse(updated);
  }

  async changeMyPassword(userId: number, dto: ChangeMyPasswordDto) {
    const user = await this.getExistingUser(userId);
    if (!user.passwordHash) {
      throw new BadRequestException(
        'Password is not set yet. Complete invite onboarding first.',
      );
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );
    if (!isCurrentPasswordValid) {
      throw new ForbiddenException('Current password is incorrect');
    }

    const samePassword = await bcrypt.compare(
      dto.newPassword,
      user.passwordHash,
    );
    if (samePassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS) },
    });

    return { message: 'Password updated successfully' };
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
    return this.toResponse(await this.getExistingUser(id));
  }

  async updateUserRole(id: number, dto: UpdateUserRoleDto) {
    const user = await this.getExistingUser(id);
    const nextRole = this.resolveRoleById(dto.roleId);

    if (
      user.role === Role.ADMINISTRATOR &&
      user.isActive &&
      nextRole !== Role.ADMINISTRATOR
    ) {
      await this.ensureAnotherActiveAdministratorExists(id);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { role: nextRole, roleId: dto.roleId },
    });

    return this.toResponse(updated);
  }

  async updateUserStatus(id: number, dto: UpdateUserStatusDto) {
    const user = await this.getExistingUser(id);
    const nextStatus = this.mapStatusFromApi(dto.status);

    if (
      user.role === Role.ADMINISTRATOR &&
      user.isActive &&
      nextStatus !== StatusValue.active
    ) {
      await this.ensureAnotherActiveAdministratorExists(id);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        status: nextStatus,
        isActive: nextStatus === StatusValue.active,
        refreshTokenHash:
          nextStatus === StatusValue.active ? user.refreshTokenHash : null,
        sessionVersion:
          nextStatus === StatusValue.active
            ? user.sessionVersion
            : user.sessionVersion + 1,
      },
    });

    return this.toResponse(updated);
  }

  private async getExistingUser(id: number): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
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
    return STATUS_FROM_API_MAP[status];
  }

  private normalizeStatusFilter(status: string): StatusValue {
    const value = STATUS_FILTER_MAP[status.toLowerCase().trim()];
    if (!value) {
      throw new BadRequestException('Invalid status filter value');
    }

    return value;
  }

  private normalizeRoleFilter(role: string): Role {
    const normalized = role
      .toLowerCase()
      .trim()
      .replace(/[\s/]+/g, '_');
    const value = ROLE_FILTER_MAP[normalized];
    if (!value) {
      throw new BadRequestException('Invalid role filter value');
    }

    return value;
  }

  private splitName(name: string): { firstName: string; lastName: string } {
    const cleaned = name.trim().replace(/\s+/g, ' ');
    if (!cleaned) {
      throw new BadRequestException('name is required');
    }

    const parts = cleaned.split(' ');
    const firstName = parts.shift() || '';
    const lastName = parts.join(' ');

    return { firstName, lastName };
  }

  private toResponse(user: User) {
    return {
      id: user.id,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`.trim(),
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      timezone: user.timezone,
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
    const hours = Number(
      process.env.INVITE_EXPIRATION_HOURS || DEFAULT_INVITE_HOURS,
    );
    return new Date(Date.now() + hours * 60 * 60 * 1000);
  }

  private getInviteExpirySeconds(): number {
    return (
      Number(process.env.INVITE_EXPIRATION_HOURS || DEFAULT_INVITE_HOURS) *
      60 *
      60
    );
  }

  private verifyInviteToken(token: string): InviteTokenPayload {
    try {
      return this.jwtService.verify<InviteTokenPayload>(token, {
        secret: process.env.JWT_SECRET || 'dev-invite-secret',
      });
    } catch {
      throw new ForbiddenException('Invite token is invalid or expired');
    }
  }

  private buildInviteLink(token: string): string {
    const frontendBaseUrl =
      process.env.FRONTEND_BASE_URL || 'http://localhost:3000';
    return `${frontendBaseUrl}/accept-invite?token=${encodeURIComponent(token)}`;
  }
}
