import { IsJWT, IsString, MinLength } from 'class-validator';

export class AcceptInviteDto {
  @IsJWT()
  inviteToken!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
