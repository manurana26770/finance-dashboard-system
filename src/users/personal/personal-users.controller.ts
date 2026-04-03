import {
  Body,
  Controller,
  Get,
  Patch,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { UsersService } from '../users.service';
import { ChangeMyPasswordDto } from './dto/change-my-password.dto';
import { UpdateProfileMeDto } from './dto/update-profile-me.dto';

@Controller('users/me')
@UseGuards(JwtAuthGuard)
export class PersonalUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getMyProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getMyProfile(user.id);
  }

  @Patch()
  updateMyProfile(@CurrentUser() user: AuthenticatedUser, @Body() updateProfileMeDto: UpdateProfileMeDto) {
    return this.usersService.updateMyProfile(user.id, updateProfileMeDto);
  }

  @Put('password')
  changeMyPassword(@CurrentUser() user: AuthenticatedUser, @Body() changeMyPasswordDto: ChangeMyPasswordDto) {
    return this.usersService.changeMyPassword(user.id, changeMyPasswordDto);
  }
}
