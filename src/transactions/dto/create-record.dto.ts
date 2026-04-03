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

export enum CreateRecordType {
  income = 'income',
  expense = 'expense',
}

export class CreateRecordDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsEnum(CreateRecordType)
  type!: CreateRecordType;

  @IsString()
  @MaxLength(120)
  category!: string;

  @IsDateString()
  date!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
