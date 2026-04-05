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
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthorizeRoles } from '../../common/decorators/access.decorator';
import { ParsePositiveIntPipe } from '../../common/pipes/parse-positive-int.pipe';
import { buildEndpointDescription } from '../../common/swagger/swagger-docs';
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
  @ApiOperation({
    summary: 'Invite a new user into the system',
    description: buildEndpointDescription({
      purpose:
        'Creates a pending user account, assigns an initial role, and issues an invite workflow so the user can activate their account.',
      behavior: [
        'Rejects duplicate emails.',
        'Stores the account in pending status, generates an invite token, and sends the invite email through the configured email service.',
        'The created account cannot log in until the invite is accepted.',
      ],
      access: ['Requires `ADMINISTRATOR` role.'],
      flow: [
        'Administrator authenticates with `POST /auth/login`.',
        'Administrator calls this endpoint to create the pending account.',
        'Invited user completes onboarding with `POST /users/accept-invite`.',
      ],
      notes: [
        'The response includes the created user summary and the invite expiration timestamp.',
      ],
    }),
  })
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
  @ApiBadRequestResponse({ description: 'Submitted payload is invalid, for example an unsupported role id was provided' })
  @ApiForbiddenResponse({ description: 'Authenticated user is not an administrator' })
  @ApiUnauthorizedResponse({ description: 'Missing token or insufficient permissions' })
  inviteUser(@Body() inviteUserDto: InviteUserDto) {
    return this.usersService.inviteUser(inviteUserDto);
  }

  @Get()
  @ApiOperation({
    summary: 'List users with pagination and filters',
    description: buildEndpointDescription({
      purpose:
        'Returns paginated user accounts so administrators can review status, roles, and high-level account details.',
      behavior: [
        'Supports pagination and optional status/role filters.',
        'Returns normalized user response objects rather than raw Prisma entities.',
      ],
      access: ['Requires `ADMINISTRATOR` role.'],
      flow: [
        'Authenticate first with `POST /auth/login`.',
        'Use this endpoint before updating a role or status when the client needs ids and current state.',
      ],
    }),
  })
  @ApiOkResponse({ description: 'User list returned successfully' })
  @ApiBadRequestResponse({ description: 'One or more query parameters are invalid or the role/status filter could not be normalized' })
  @ApiForbiddenResponse({ description: 'Authenticated user is not an administrator' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  listUsers(@Query() query: ListUsersQueryDto) {
    return this.usersService.listUsers(query);
  }

  @Get(':id(\\d+)')
  @ApiOperation({
    summary: 'Get a user by numeric id',
    description: buildEndpointDescription({
      purpose:
        'Loads a single user account in detail for administrative review or follow-up actions.',
      behavior: [
        'Uses a numeric path parameter validated by a positive integer pipe.',
        'Returns a normalized response object for the requested user.',
      ],
      access: ['Requires `ADMINISTRATOR` role.'],
      flow: [
        'Typically called after `GET /users` when the administrator selects a specific user for inspection.',
      ],
    }),
  })
  @ApiParam({ name: 'id', type: Number, description: 'User id' })
  @ApiOkResponse({ description: 'User returned successfully' })
  @ApiNotFoundResponse({ description: 'No user exists with the supplied id' })
  @ApiForbiddenResponse({ description: 'Authenticated user is not an administrator' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  getUserById(@Param('id', ParsePositiveIntPipe) id: number) {
    return this.usersService.getUserById(id);
  }

  @Put(':id(\\d+)/role')
  @ApiOperation({
    summary: 'Update a user role assignment',
    description: buildEndpointDescription({
      purpose:
        'Changes the role attached to an existing user account.',
      behavior: [
        'Maps the submitted role id into the internal role enum and updates both `role` and `roleId` fields.',
        'Protects the system from removing the last active administrator from the administrator role.',
      ],
      access: ['Requires `ADMINISTRATOR` role.'],
      flow: [
        'Usually preceded by `GET /users` or `GET /users/:id` so the administrator can inspect the current assignment.',
        'After success, clients should refresh any local user listing because role-sensitive access changes immediately.',
      ],
    }),
  })
  @ApiParam({ name: 'id', type: Number, description: 'User id' })
  @ApiOkResponse({ description: 'User role updated successfully' })
  @ApiBadRequestResponse({ description: 'Role id is invalid or the update would remove the last active administrator' })
  @ApiNotFoundResponse({ description: 'No user exists with the supplied id' })
  @ApiForbiddenResponse({ description: 'Authenticated user is not an administrator' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  updateUserRole(
    @Param('id', ParsePositiveIntPipe) id: number,
    @Body() updateUserRoleDto: UpdateUserRoleDto,
  ) {
    return this.usersService.updateUserRole(id, updateUserRoleDto);
  }

  @Patch(':id(\\d+)/status')
  @ApiOperation({
    summary: 'Update a user account status',
    description: buildEndpointDescription({
      purpose:
        'Changes whether a user account is active, suspended, or deactivated.',
      behavior: [
        'Updates both the external status value and the internal `isActive` flag.',
        'Invalidates the user session by clearing or rotating session state when the status becomes non-active.',
        'Protects the system from deactivating or suspending the last active administrator.',
      ],
      access: ['Requires `ADMINISTRATOR` role.'],
      flow: [
        'Usually preceded by `GET /users` or `GET /users/:id` so the administrator can inspect the current state.',
        'Use this when you need to suspend access without deleting the account.',
      ],
    }),
  })
  @ApiParam({ name: 'id', type: Number, description: 'User id' })
  @ApiOkResponse({ description: 'User status updated successfully' })
  @ApiBadRequestResponse({ description: 'Status is invalid or the update would deactivate the last active administrator' })
  @ApiNotFoundResponse({ description: 'No user exists with the supplied id' })
  @ApiForbiddenResponse({ description: 'Authenticated user is not an administrator' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  updateUserStatus(
    @Param('id', ParsePositiveIntPipe) id: number,
    @Body() updateUserStatusDto: UpdateUserStatusDto,
  ) {
    return this.usersService.updateUserStatus(id, updateUserStatusDto);
  }
}
