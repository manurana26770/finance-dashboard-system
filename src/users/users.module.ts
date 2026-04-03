import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma.service';
import { AdministrativeUsersController } from './administrative/administrative-users.controller';
import { InviteEmailService } from '../common/services/invite-email.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-invite-secret',
      signOptions: {
        expiresIn: Number(process.env.INVITE_EXPIRATION_HOURS || 48) * 60 * 60,
      },
    }),
  ],
  controllers: [UsersController, AdministrativeUsersController],
  providers: [UsersService, PrismaService, InviteEmailService],
})
export class UsersModule {}