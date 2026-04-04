import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AcceptInviteDto } from '../common/dto/accept-invite.dto';
import { UsersService } from './users.service';

@Controller('users')
@ApiTags('Users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('accept-invite')
  @ApiOperation({ summary: 'Accept user invite and set initial password' })
  @ApiCreatedResponse({ description: 'Invite accepted successfully' })
  @ApiUnauthorizedResponse({ description: 'Invite token is invalid or expired' })
  acceptInvite(@Body() acceptInviteDto: AcceptInviteDto) {
    return this.usersService.acceptInvite(acceptInviteDto);
  }
}
