import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ParsePositiveIntPipe } from '../../common/pipes/parse-positive-int.pipe';
import { UsersService } from '../users.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@Controller('users')
export class AdministrativeUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('invite')
  inviteUser(@Body() inviteUserDto: InviteUserDto) {
    return this.usersService.inviteUser(inviteUserDto);
  }

  @Get()
  listUsers(@Query() query: ListUsersQueryDto) {
    return this.usersService.listUsers(query);
  }

  @Get(':id')
  getUserById(@Param('id', ParsePositiveIntPipe) id: number) {
    return this.usersService.getUserById(id);
  }

  @Put(':id/role')
  updateUserRole(
    @Param('id', ParsePositiveIntPipe) id: number,
    @Body() updateUserRoleDto: UpdateUserRoleDto,
  ) {
    return this.usersService.updateUserRole(id, updateUserRoleDto);
  }

  @Patch(':id/status')
  updateUserStatus(
    @Param('id', ParsePositiveIntPipe) id: number,
    @Body() updateUserStatusDto: UpdateUserStatusDto,
  ) {
    return this.usersService.updateUserStatus(id, updateUserStatusDto);
  }
}
