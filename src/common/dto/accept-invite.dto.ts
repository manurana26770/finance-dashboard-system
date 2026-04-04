import { IsJWT, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AcceptInviteDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Invite JWT token from invitation email',
  })
  @IsJWT()
  inviteToken!: string;

  @ApiProperty({
    example: 'MySecurePassword123',
    minLength: 8,
    description: 'Initial account password',
  })
  @IsString()
  @MinLength(8)
  password!: string;
}
