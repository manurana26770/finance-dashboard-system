import {
  Body,
  Controller,
  Get,
  Put,
  Query,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ParsePositiveIntPipe } from '../../../common/pipes/parse-positive-int.pipe';
import { AdministratorUsersService } from './administrator-users.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@Controller('users')
export class AdministratorUsersController {
  constructor(
    private readonly administratorUsersService: AdministratorUsersService,
  ) {}

  @Get()
  findAll(@Query() query: ListUsersQueryDto) {
    return this.administratorUsersService.findAll(query);
  }

  @Post('invite')
  invite(@Body() inviteUserDto: InviteUserDto) {
    return this.administratorUsersService.invite(inviteUserDto);
  }

  @Get(':user_id')
  findOne(@Param('user_id', ParsePositiveIntPipe) userId: number) {
    return this.administratorUsersService.findOne(userId);
  }

  @Patch(':user_id')
  updateProfile(
    @Param('user_id', ParsePositiveIntPipe) userId: number,
    @Body() updateUserProfileDto: UpdateUserProfileDto,
  ) {
    return this.administratorUsersService.updateProfile(
      userId,
      updateUserProfileDto,
    );
  }

  @Put(':user_id/role')
  updateRole(
    @Param('user_id', ParsePositiveIntPipe) userId: number,
    @Body() updateUserRoleDto: UpdateUserRoleDto,
  ) {
    return this.administratorUsersService.updateRole(userId, updateUserRoleDto);
  }

  @Post(':user_id/status')
  updateStatus(
    @Param('user_id', ParsePositiveIntPipe) userId: number,
    @Body() updateUserStatusDto: UpdateUserStatusDto,
  ) {
    return this.administratorUsersService.updateStatus(
      userId,
      updateUserStatusDto,
    );
  }
}
