import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'analyst@company.com', description: 'User email address' })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'MyStrongPassword123',
    minLength: 8,
    description: 'User account password',
  })
  @IsString()
  @MinLength(8)
  password!: string;
}