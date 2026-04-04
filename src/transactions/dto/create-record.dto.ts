import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export enum CreateRecordType {
  income = 'income',
  expense = 'expense',
}

export class CreateRecordDto {
  @ApiProperty({
    example: 2500.5,
    description: 'Record amount with up to 2 decimal places',
    minimum: 0.01,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @ApiProperty({
    enum: CreateRecordType,
    example: CreateRecordType.expense,
    description: 'Financial record type',
  })
  @IsEnum(CreateRecordType)
  type!: CreateRecordType;

  @ApiProperty({
    example: 'operations',
    maxLength: 120,
    description: 'Business category for this record',
  })
  @IsString()
  @MaxLength(120)
  category!: string;

  @ApiProperty({
    example: '2026-04-04',
    description: 'Record date (ISO 8601 date or date-time)',
  })
  @IsDateString()
  date!: string;

  @ApiPropertyOptional({
    example: 'Quarterly software subscription',
    maxLength: 1000,
    description: 'Optional record notes',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
