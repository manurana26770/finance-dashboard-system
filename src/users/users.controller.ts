import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AcceptInviteDto } from '../common/dto/accept-invite.dto';
import { buildEndpointDescription } from '../common/swagger/swagger-docs';
import { UsersService } from './users.service';

@Controller('users')
@ApiTags('Users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('accept-invite')
  @ApiOperation({
    summary: 'Activate an invited user account',
    description: buildEndpointDescription({
      purpose:
        'Completes invite onboarding by validating the invite token and setting the initial account password.',
      behavior: [
        'Only works for accounts that are still in pending status and whose invite token JTI matches the stored invite state.',
        'Marks the user as active, clears invite metadata, and enables normal login.',
      ],
      access: ['Public endpoint. No access token is required.'],
      flow: [
        'Administrator first creates the invite with `POST /users/invite`.',
        'Invited user extracts the invite token from the email or admin-delivered link.',
        'After this call succeeds, the user can log in with `POST /auth/login`.',
      ],
    }),
  })
  @ApiCreatedResponse({ description: 'Invite accepted successfully' })
  @ApiBadRequestResponse({ description: 'Invite is no longer valid for the current account state, for example the account is already active' })
  @ApiForbiddenResponse({ description: 'Invite token is expired, mismatched, or otherwise invalid for the targeted user' })
  @ApiUnauthorizedResponse({ description: 'Invite token is invalid or expired' })
  acceptInvite(@Body() acceptInviteDto: AcceptInviteDto) {
    return this.usersService.acceptInvite(acceptInviteDto);
  }
}
