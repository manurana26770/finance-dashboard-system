import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export enum UpdateRecordType {
  income = 'income',
  expense = 'expense',
}

export enum UpdateRecordStatus {
  pending = 'pending',
  approved = 'approved',
  rejected = 'rejected',
}

export class UpdateRecordDto {
  @ApiPropertyOptional({
    example: 990.5,
    minimum: 0.01,
    description: 'Updated amount',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount?: number;

  @ApiPropertyOptional({ enum: UpdateRecordType, description: 'Updated record type' })
  @IsOptional()
  @IsEnum(UpdateRecordType)
  type?: UpdateRecordType;

  @ApiPropertyOptional({ example: 'travel', description: 'Updated category' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string;

  @ApiPropertyOptional({ example: '2026-04-05', description: 'Updated record date' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({
    example: 'Submitted invoice copy',
    description: 'Updated notes',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({
    example: 'Controller review comments',
    description: 'Optional description or review details',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ enum: UpdateRecordStatus, description: 'Updated review status' })
  @IsOptional()
  @IsEnum(UpdateRecordStatus)
  status?: UpdateRecordStatus;
}
