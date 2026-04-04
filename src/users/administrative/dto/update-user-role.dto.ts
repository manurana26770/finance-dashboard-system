import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserRoleDto {
  @ApiProperty({ example: 2, description: 'New role id for the user' })
  @IsInt()
  @Min(1)
  roleId!: number;
}
