import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, StatusValue, User } from '@prisma/client';
import { PrismaService } from '../../../common/prisma.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

const ROLE_BY_ID: Record<number, Role> = {
  1: Role.ADMINISTRATOR,
  2: Role.CONTROLLER_APPROVER,
  3: Role.CLERK_SUBMITTER,
  4: Role.ANALYST,
  5: Role.ORCHESTRATOR,
};

const STATUS_VALUES: StatusValue[] = [
  StatusValue.pending,
  StatusValue.active,
  StatusValue.suspended,
  StatusValue.inactive,
];

@Injectable()
export class AdministratorUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListUsersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (query.role) {
      where.role = this.normalizeRole(query.role);
    }

    if (query.status) {
      where.status = this.normalizeStatus(query.status);
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'asc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users: users.map((user) => this.toUserResponse(user)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async findOne(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toUserResponse(user);
  }

  async invite(inviteUserDto: InviteUserDto) {
    const email = inviteUserDto.email.toLowerCase().trim();
    const { firstName, lastName } = this.splitName(inviteUserDto.name);
    const role = this.getRoleFromRoleId(inviteUserDto.role_id);

    const userExists = await this.prisma.user.findUnique({
      where: { email },
    });

    if (userExists) {
      throw new ConflictException('User with this email already exists');
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        role,
        roleId: inviteUserDto.role_id,
        status: StatusValue.pending,
        isActive: false,
      },
    });

    return this.toUserResponse(user);
  }

  async updateProfile(userId: number, updateUserProfileDto: UpdateUserProfileDto) {
    const existingUser = await this.getExistingUser(userId);

    if (Object.keys(updateUserProfileDto).length === 0) {
      throw new BadRequestException('At least one field must be provided for update');
    }

    const data: Prisma.UserUpdateInput = {};

    if (updateUserProfileDto.email) {
      const normalizedEmail = updateUserProfileDto.email.toLowerCase().trim();

      if (normalizedEmail !== existingUser.email) {
        const conflictingUser = await this.prisma.user.findUnique({
          where: { email: normalizedEmail },
        });

        if (conflictingUser) {
          throw new ConflictException('User with this email already exists');
        }
      }

      data.email = normalizedEmail;
    }

    if (updateUserProfileDto.name) {
      const { firstName, lastName } = this.splitName(updateUserProfileDto.name);
      data.firstName = firstName;
      data.lastName = lastName;
    }

    if (updateUserProfileDto.department !== undefined) {
      data.department = updateUserProfileDto.department?.trim() || null;
    }

    if (updateUserProfileDto.reporting_manager !== undefined) {
      data.reportingManager = updateUserProfileDto.reporting_manager?.trim() || null;
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
    });

    return this.toUserResponse(user);
  }

  async updateRole(userId: number, updateUserRoleDto: UpdateUserRoleDto) {
    const existingUser = await this.getExistingUser(userId);
    const nextRole = this.getRoleFromRoleId(updateUserRoleDto.role_id);

    if (
      existingUser.role === Role.ADMINISTRATOR &&
      existingUser.isActive &&
      nextRole !== Role.ADMINISTRATOR
    ) {
      await this.ensureAnotherActiveAdministratorExists(userId);
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        role: nextRole,
        roleId: updateUserRoleDto.role_id,
      },
    });

    return this.toUserResponse(user);
  }

  async updateStatus(userId: number, updateUserStatusDto: UpdateUserStatusDto) {
    const existingUser = await this.getExistingUser(userId);
    const nextStatus = this.normalizeStatus(updateUserStatusDto.status);

    if (
      existingUser.role === Role.ADMINISTRATOR &&
      existingUser.isActive &&
      nextStatus !== StatusValue.active
    ) {
      await this.ensureAnotherActiveAdministratorExists(userId);
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: nextStatus,
        isActive: nextStatus === StatusValue.active,
      },
    });

    return this.toUserResponse(user);
  }

  private async getExistingUser(userId: number): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private async ensureAnotherActiveAdministratorExists(userId: number) {
    const activeAdminCount = await this.prisma.user.count({
      where: {
        role: Role.ADMINISTRATOR,
        isActive: true,
        id: { not: userId },
      },
    });

    if (activeAdminCount < 1) {
      throw new BadRequestException(
        'Cannot perform this action on the last active administrator',
      );
    }
  }

  private getRoleFromRoleId(roleId: number): Role {
    const role = ROLE_BY_ID[roleId];

    if (!role) {
      throw new BadRequestException('Invalid role_id');
    }

    return role;
  }

  private normalizeRole(role: string): Role {
    const normalizedRole = role.toLowerCase().trim().replace(/[\s/]+/g, '_');

    const roleMap: Record<string, Role> = {
      administrator: Role.ADMINISTRATOR,
      orchestrator: Role.ORCHESTRATOR,
      controller_approver: Role.CONTROLLER_APPROVER,
      clerk_submitter: Role.CLERK_SUBMITTER,
      analyst: Role.ANALYST,
    };

    const enumRole = roleMap[normalizedRole];

    if (!enumRole) {
      throw new BadRequestException('Invalid role value');
    }

    return enumRole;
  }

  private normalizeStatus(status: string): StatusValue {
    const normalizedStatus = status.toLowerCase().trim() as StatusValue;

    if (!STATUS_VALUES.includes(normalizedStatus)) {
      throw new BadRequestException('Invalid status value');
    }

    return normalizedStatus;
  }

  private splitName(name: string): { firstName: string; lastName: string } {
    const normalizedName = name
      .trim()
      .replace(/\s+/g, ' ');

    if (!normalizedName) {
      throw new BadRequestException('name is required');
    }

    const parts = normalizedName.split(' ');
    const firstName = parts.shift() || '';
    const lastName = parts.join(' ');

    return { firstName, lastName };
  }

  private toUserResponse(user: User) {
    const fullName = `${user.firstName} ${user.lastName}`.trim();

    return {
      user_id: user.id,
      email: user.email,
      name: fullName,
      role: user.role,
      role_id: user.roleId,
      status: user.status,
      department: user.department,
      reporting_manager: user.reportingManager,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
    };
  }
}
