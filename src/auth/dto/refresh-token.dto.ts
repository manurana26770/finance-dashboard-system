import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({
    example: 'eyJhbGciOi...refresh-token',
    minLength: 20,
    description: 'Valid refresh token used to obtain a new access token',
  })
  @IsString()
  @MinLength(20)
  refreshToken!: string;
}