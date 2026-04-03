import { Type } from 'class-transformer';
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
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsEnum(ListRecordsType)
  type?: ListRecordsType;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(ListRecordsStatus)
  status?: ListRecordsStatus;
}
