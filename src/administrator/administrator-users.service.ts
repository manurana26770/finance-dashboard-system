import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class AdministratorUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const email = createUserDto.email.toLowerCase().trim();

    const userExists = await this.prisma.user.findUnique({
      where: { email },
    });

    if (userExists) {
      throw new ConflictException('User with this email already exists');
    }

    return this.prisma.user.create({
      data: {
        email,
        firstName: createUserDto.firstName.trim(),
        lastName: createUserDto.lastName.trim(),
        role: 'administrator',
      },
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const existingUser = await this.findOne(id);

    if (Object.keys(updateUserDto).length === 0) {
      throw new BadRequestException('At least one field must be provided for update');
    }

    if (updateUserDto.email) {
      const normalizedEmail = updateUserDto.email.toLowerCase().trim();

      if (normalizedEmail !== existingUser.email) {
        const conflictingUser = await this.prisma.user.findUnique({
          where: { email: normalizedEmail },
        });

        if (conflictingUser) {
          throw new ConflictException('User with this email already exists');
        }
      }

      updateUserDto.email = normalizedEmail;
    }

    if (existingUser.role === 'administrator' && updateUserDto.isActive === false) {
      const activeAdminCount = await this.prisma.user.count({
        where: {
          role: 'administrator',
          isActive: true,
        },
      });

      if (activeAdminCount <= 1) {
        throw new BadRequestException('Cannot deactivate the last active administrator');
      }
    }

    if (updateUserDto.firstName) {
      updateUserDto.firstName = updateUserDto.firstName.trim();
    }

    if (updateUserDto.lastName) {
      updateUserDto.lastName = updateUserDto.lastName.trim();
    }

    return this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });
  }

  async remove(id: number) {
    const existingUser = await this.findOne(id);

    if (existingUser.role === 'administrator' && existingUser.isActive) {
      const activeAdminCount = await this.prisma.user.count({
        where: {
          role: 'administrator',
          isActive: true,
        },
      });

      if (activeAdminCount <= 1) {
        throw new BadRequestException('Cannot delete the last active administrator');
      }
    }

    await this.prisma.user.delete({
      where: { id },
    });

    return { message: 'User deleted successfully' };
  }
}
