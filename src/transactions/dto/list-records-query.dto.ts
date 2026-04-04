import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export enum ListRecordsType {
  income = 'income',
  expense = 'expense',
}

export enum ListRecordsStatus {
  pending = 'pending',
  approved = 'approved',
  rejected = 'rejected',
  deleted = 'deleted',
}

export class ListRecordsQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1, description: 'Page number' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    example: 20,
    minimum: 1,
    maximum: 100,
    description: 'Number of records per page',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ enum: ListRecordsType, description: 'Filter by record type' })
  @IsOptional()
  @IsEnum(ListRecordsType)
  type?: ListRecordsType;

  @ApiPropertyOptional({ example: 'operations', description: 'Filter by category name' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string;

  @ApiPropertyOptional({
    example: '2026-04-01',
    description: 'Start date filter (inclusive)',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2026-04-30',
    description: 'End date filter (inclusive)',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ enum: ListRecordsStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(ListRecordsStatus)
  status?: ListRecordsStatus;
}
