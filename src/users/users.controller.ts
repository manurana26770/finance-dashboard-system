import { Body, Controller, Post } from '@nestjs/common';
import { AcceptInviteDto } from '../common/dto/accept-invite.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('accept-invite')
  acceptInvite(@Body() acceptInviteDto: AcceptInviteDto) {
    return this.usersService.acceptInvite(acceptInviteDto);
  }
}
