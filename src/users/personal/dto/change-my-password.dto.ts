import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangeMyPasswordDto {
  @ApiProperty({
    example: 'CurrentPassword123',
    description: 'Current account password',
  })
  @IsString()
  currentPassword!: string;

  @ApiProperty({
    example: 'NewStrongPassword123',
    minLength: 8,
    description: 'New password to set',
  })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}
