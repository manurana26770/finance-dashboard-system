import { IsIn, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserStatusDto {
  @ApiProperty({
    enum: ['ACTIVE', 'SUSPENDED', 'DEACTIVATED'],
    example: 'ACTIVE',
    description: 'Updated account status',
  })
  @IsString()
  @IsIn(['ACTIVE', 'SUSPENDED', 'DEACTIVATED'])
  status!: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
}
