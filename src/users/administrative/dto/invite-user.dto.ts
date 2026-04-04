import {
  IsEmail,
  IsInt,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InviteUserDto {
  @ApiProperty({ example: 'new.user@company.com', description: 'Email for invited user' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: 'Jane Doe', description: 'Full name for invited user' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ example: 4, description: 'Role id to assign to invited user' })
  @IsInt()
  @Min(1)
  roleId!: number;
}
