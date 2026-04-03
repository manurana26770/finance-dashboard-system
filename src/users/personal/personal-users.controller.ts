import {
  Body,
  Controller,
  Get,
  Patch,
  Put,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { UsersService } from '../users.service';
import { ChangeMyPasswordDto } from './dto/change-my-password.dto';
import { UpdateProfileMeDto } from './dto/update-profile-me.dto';

@Controller('users/me')
export class PersonalUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getMyProfile(@Req() req: Request) {
    return this.usersService.getMyProfile(this.extractAuthenticatedUserId(req));
  }

  @Patch()
  updateMyProfile(
    @Req() req: Request,
    @Body() updateProfileMeDto: UpdateProfileMeDto,
  ) {
    return this.usersService.updateMyProfile(
      this.extractAuthenticatedUserId(req),
      updateProfileMeDto,
    );
  }

  @Put('password')
  changeMyPassword(
    @Req() req: Request,
    @Body() changeMyPasswordDto: ChangeMyPasswordDto,
  ) {
    return this.usersService.changeMyPassword(
      this.extractAuthenticatedUserId(req),
      changeMyPasswordDto,
    );
  }

  private extractAuthenticatedUserId(req: Request): number {
    const user = (req as Request & { user?: { id?: unknown; sub?: unknown } })
      .user;
    const candidate = user?.id ?? user?.sub;

    const userId =
      typeof candidate === 'number' ? candidate : Number(candidate);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Authenticated user context is missing');
    }

    return userId;
  }
}
