import { Type } from 'class-transformer';
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
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsEnum(UpdateRecordType)
  type?: UpdateRecordType;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsEnum(UpdateRecordStatus)
  status?: UpdateRecordStatus;
}
