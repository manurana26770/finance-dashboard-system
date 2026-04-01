import { IsInt, Min } from 'class-validator';

export class UpdateUserRoleDto {
  @IsInt()
  @Min(1)
  role_id!: number;
}