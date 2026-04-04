import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LogoutDto {
  @ApiProperty({
    example: 'eyJhbGciOi...refresh-token',
    minLength: 20,
    description: 'Refresh token to invalidate',
  })
  @IsString()
  @MinLength(20)
  refreshToken!: string;
}