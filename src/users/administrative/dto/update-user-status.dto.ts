import { IsIn, IsString } from 'class-validator';

export class UpdateUserStatusDto {
  @IsString()
  @IsIn(['ACTIVE', 'SUSPENDED', 'DEACTIVATED'])
  status!: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
}