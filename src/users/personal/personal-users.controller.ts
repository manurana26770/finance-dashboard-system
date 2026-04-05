import {
  Body,
  Controller,
  Get,
  Patch,
  Put,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Authenticated } from '../../common/decorators/access.decorator';
import { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { buildEndpointDescription } from '../../common/swagger/swagger-docs';
import { UsersService } from '../users.service';
import { ChangeMyPasswordDto } from './dto/change-my-password.dto';
import { UpdateProfileMeDto } from './dto/update-profile-me.dto';

@Controller('users/me')
@Authenticated()
@ApiTags('Users - Personal')
@ApiBearerAuth('access-token')
export class PersonalUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({
    summary: 'Get the authenticated user profile',
    description: buildEndpointDescription({
      purpose:
        'Returns the profile record of the user represented by the current access token.',
      behavior: [
        'Loads the user directly from the database rather than trusting only token claims.',
        'Returns profile, role, status, and account metadata needed by the logged-in user interface.',
      ],
      access: ['Requires any valid authenticated user bearer token.'],
      flow: [
        'Typically called after `POST /auth/login` or app bootstrap to load profile data.',
      ],
    }),
  })
  @ApiOkResponse({ description: 'Authenticated profile returned successfully' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  getMyProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getMyProfile(user.id);
  }

  @Patch()
  @ApiOperation({
    summary: 'Update the authenticated user profile',
    description: buildEndpointDescription({
      purpose:
        'Allows the logged-in user to update their own editable profile fields without administrator involvement.',
      behavior: [
        'Only fields present in the payload are changed.',
        'Rejects empty payloads and validates formatting for phone numbers, URLs, and length limits.',
      ],
      access: ['Requires any valid authenticated user bearer token.'],
      flow: [
        'Call after login when the user wants to keep personal profile details current.',
        'Clients usually refresh local profile state with the returned payload rather than re-calling `GET /users/me`.',
      ],
    }),
  })
  @ApiOkResponse({ description: 'Authenticated profile updated successfully' })
  @ApiBadRequestResponse({ description: 'Payload is empty or one or more fields fail validation' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  updateMyProfile(@CurrentUser() user: AuthenticatedUser, @Body() updateProfileMeDto: UpdateProfileMeDto) {
    return this.usersService.updateMyProfile(user.id, updateProfileMeDto);
  }

  @Put('password')
  @ApiOperation({
    summary: 'Change the authenticated user password',
    description: buildEndpointDescription({
      purpose:
        'Lets a logged-in user rotate their own password using the current password as proof of possession.',
      behavior: [
        'Verifies the current password before storing the new password hash.',
        'Rejects password changes if the invite onboarding password was never set or if the new password matches the current one.',
      ],
      access: ['Requires any valid authenticated user bearer token.'],
      flow: [
        'User should already be logged in through `POST /auth/login`.',
        'After success, the current session remains valid because only the password hash changes.',
      ],
    }),
  })
  @ApiOkResponse({ description: 'Password updated successfully' })
  @ApiBadRequestResponse({ description: 'Password is missing, too short, unchanged, or the account is not ready for password changes' })
  @ApiForbiddenResponse({ description: 'Current password is incorrect' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  changeMyPassword(@CurrentUser() user: AuthenticatedUser, @Body() changeMyPasswordDto: ChangeMyPasswordDto) {
    return this.usersService.changeMyPassword(user.id, changeMyPasswordDto);
  }
}
