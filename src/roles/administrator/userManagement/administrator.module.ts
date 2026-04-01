import { Module } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { AdministratorUsersController } from './administrator-users.controller';
import { AdministratorUsersService } from './administrator-users.service';

@Module({
  controllers: [AdministratorUsersController],
  providers: [AdministratorUsersService, PrismaService],
})
export class AdministratorModule {}
