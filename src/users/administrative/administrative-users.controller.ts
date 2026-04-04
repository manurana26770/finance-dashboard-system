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
import { Role } from '@prisma/client';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthorizeRoles } from '../../common/decorators/access.decorator';
import { ParsePositiveIntPipe } from '../../common/pipes/parse-positive-int.pipe';
import { UsersService } from '../users.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@Controller('users')
@AuthorizeRoles(Role.ADMINISTRATOR)
@ApiTags('Users - Administrative')
@ApiBearerAuth('access-token')
export class AdministrativeUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('invite')
  @ApiOperation({ summary: 'Invite a new user to the system (admin only)' })
  @ApiCreatedResponse({
    description: 'User invite created successfully and invite token returned',
    schema: {
      example: {
        success: true,
        statusCode: 201,
        path: '/api/v1/users/invite',
        timestamp: '2026-04-04T09:43:58.457Z',
        data: {
          message: 'User invited successfully',
          inviteExpiresAt: '2026-04-06T09:43:52.983Z',
          inviteToken:
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjIsInR5cGUiOiJpbnZpdGUiLCJqdGkiOiI1N2YxMjM0NS02Nzg5LTQ1NjctODkwYS1iY2RlZjEyMzQ1NjcifQ.signature',
          user: {
            id: 2,
            email: 'manishrana@gmail.com',
            name: 'Manish Rana',
            firstName: 'Manish',
            lastName: 'Rana',
            phone: null,
            avatarUrl: null,
            timezone: null,
            role: 'CLERK_SUBMITTER',
            roleId: 4,
            status: 'pending',
            isActive: false,
            department: null,
            reportingManager: null,
            createdAt: '2026-04-04T09:43:52.983Z',
            updatedAt: '2026-04-04T09:43:52.983Z',
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Missing token or insufficient permissions' })
  inviteUser(@Body() inviteUserDto: InviteUserDto) {
    return this.usersService.inviteUser(inviteUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'List users with optional status and role filters' })
  @ApiOkResponse({ description: 'Users list returned' })
  listUsers(@Query() query: ListUsersQueryDto) {
    return this.usersService.listUsers(query);
  }

  @Get(':id(\\d+)')
  @ApiOperation({ summary: 'Get a single user by id' })
  @ApiParam({ name: 'id', type: Number, description: 'User id' })
  @ApiOkResponse({ description: 'User returned' })
  getUserById(@Param('id', ParsePositiveIntPipe) id: number) {
    return this.usersService.getUserById(id);
  }

  @Put(':id(\\d+)/role')
  @ApiOperation({ summary: 'Update user role' })
  @ApiParam({ name: 'id', type: Number, description: 'User id' })
  @ApiOkResponse({ description: 'User role updated' })
  updateUserRole(
    @Param('id', ParsePositiveIntPipe) id: number,
    @Body() updateUserRoleDto: UpdateUserRoleDto,
  ) {
    return this.usersService.updateUserRole(id, updateUserRoleDto);
  }

  @Patch(':id(\\d+)/status')
  @ApiOperation({ summary: 'Update user account status' })
  @ApiParam({ name: 'id', type: Number, description: 'User id' })
  @ApiOkResponse({ description: 'User status updated' })
  updateUserStatus(
    @Param('id', ParsePositiveIntPipe) id: number,
    @Body() updateUserStatusDto: UpdateUserStatusDto,
  ) {
    return this.usersService.updateUserStatus(id, updateUserStatusDto);
  }
}
